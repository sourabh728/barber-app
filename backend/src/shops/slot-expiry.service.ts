import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AppointmentStatus } from '../../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatDateKeyInTimeZone,
  BUSINESS_TIMEZONE,
  slotInstantInBusinessTz,
} from '../verification/scoring';

export const SLOT_PASSED_REASON = 'Passed the slot time';

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Auto-cancels bookings nobody acted on once their slot has ended
 * (i.e. the next slot has started).
 */
@Injectable()
export class SlotExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlotExpiryService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async sweep(now: Date = new Date()): Promise<number> {
    if (this.running) {
      return 0;
    }
    this.running = true;
    try {
      const todayKey = formatDateKeyInTimeZone(now, BUSINESS_TIMEZONE);
      const candidates = await this.prisma.appointment.findMany({
        where: {
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          },
          isWalkIn: false,
          actualStartAt: null,
          arrivedAt: null,
          date: { lte: new Date(`${todayKey}T00:00:00.000Z`) },
        },
        include: { shop: { select: { id: true, name: true, ownerId: true } } },
      });

      let cancelled = 0;
      for (const appt of candidates) {
        // A pending suggested slot is what the customer is still deciding on.
        const hasProposal = appt.proposedDate && appt.proposedEndTime;
        const slotEnd = slotInstantInBusinessTz(
          hasProposal ? appt.proposedDate! : appt.date,
          hasProposal ? appt.proposedEndTime! : appt.endTime,
        );
        if (slotEnd.getTime() > now.getTime()) {
          continue;
        }

        // Guard against racing with a customer/barber action.
        const result = await this.prisma.appointment.updateMany({
          where: {
            id: appt.id,
            status: appt.status,
            actualStartAt: null,
            arrivedAt: null,
          },
          data: {
            status: AppointmentStatus.CANCELLED,
            cancelReason: SLOT_PASSED_REASON,
            proposedDate: null,
            proposedStartTime: null,
            proposedEndTime: null,
          },
        });
        if (result.count !== 1) {
          continue;
        }
        cancelled += 1;
        await this.notify(appt);
      }

      if (cancelled > 0) {
        this.logger.log(`Auto-cancelled ${cancelled} booking(s): slot passed.`);
      }
      return cancelled;
    } catch (error) {
      this.logger.error(
        'Slot expiry sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async notify(appt: {
    id: string;
    customerId: string | null;
    customerName: string;
    serviceName: string;
    startTime: string;
    shop: { name: string; ownerId: string };
  }) {
    try {
      if (appt.customerId) {
        await this.notificationsService.create({
          userId: appt.customerId,
          title: 'Booking cancelled',
          body: `Your ${appt.serviceName} booking at ${appt.shop.name} (${appt.startTime}) was cancelled: ${SLOT_PASSED_REASON.toLowerCase()}.`,
          href: `/history/${appt.id}`,
          appointmentId: appt.id,
          push: true,
        });
      }
      await this.notificationsService.create({
        userId: appt.shop.ownerId,
        title: 'Booking auto-cancelled',
        body: `${appt.customerName}'s ${appt.serviceName} booking (${appt.startTime}) was cancelled: ${SLOT_PASSED_REASON.toLowerCase()}.`,
        href: '/barber/appointments',
        appointmentId: appt.id,
      });
    } catch (error) {
      this.logger.warn(
        `Could not send auto-cancel notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
