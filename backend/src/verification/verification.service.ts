import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, UserRole } from '../../generated/prisma/enums';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { uniqueLocationNames } from '../common/location';
import {
  buildShopQrValue,
  issueServiceStartQr,
  parseAndVerifyServiceStartQr,
  parseShopQrValue,
} from './qr-tokens';
import {
  BUSINESS_TIMEZONE,
  calculateBookingScore,
  formatDateKeyInTimeZone,
  maxBookingScore,
  pointsToNumber,
  roundPoints,
  slotInstantInBusinessTz,
  weekBoundsContaining,
} from './scoring';

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async audit(params: {
    appointmentId?: string | null;
    shopId?: string | null;
    actorUserId?: string | null;
    action: string;
    success: boolean;
    detail?: string;
  }) {
    await this.prisma.verificationAuditLog.create({
      data: {
        appointmentId: params.appointmentId ?? null,
        shopId: params.shopId ?? null,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        success: params.success,
        detail: params.detail ?? null,
      },
    });
  }

  async getShopQrForOwner(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      select: { id: true, name: true, qrToken: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return {
      shopId: shop.id,
      shopName: shop.name,
      qrPayload: buildShopQrValue(shop.qrToken),
      qrToken: shop.qrToken,
    };
  }

  /**
   * Customer scans shop static QR → record arrival for today's CONFIRMED booking.
   */
  async scanShopArrival(customerId: string, qrPayload: string) {
    const parsed = parseShopQrValue(qrPayload);
    if (!parsed) {
      await this.audit({
        actorUserId: customerId,
        action: 'ARRIVAL_SCAN',
        success: false,
        detail: 'Invalid shop QR',
      });
      throw new BadRequestException('Invalid shop QR code');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { qrToken: parsed.token },
      select: { id: true, name: true, ownerId: true },
    });
    if (!shop) {
      await this.audit({
        actorUserId: customerId,
        action: 'ARRIVAL_SCAN',
        success: false,
        detail: 'Unknown shop token',
      });
      throw new NotFoundException('Shop not found for this QR code');
    }

    const todayKey = formatDateKeyInTimeZone(new Date(), BUSINESS_TIMEZONE);
    const [yy, mm, dd] = todayKey.split('-').map(Number);
    const todayDate = new Date(Date.UTC(yy, mm - 1, dd));
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        shopId: shop.id,
        customerId,
        status: AppointmentStatus.CONFIRMED,
        date: todayDate,
        isWalkIn: false,
      },
      orderBy: { startTime: 'asc' },
      include: {
        arrival: true,
        shop: { select: { name: true } },
      },
    });

    if (!appointment) {
      await this.audit({
        actorUserId: customerId,
        shopId: shop.id,
        action: 'ARRIVAL_SCAN',
        success: false,
        detail: 'No eligible CONFIRMED booking today',
      });
      throw new BadRequestException(
        'No confirmed booking found for this shop today',
      );
    }

    if (appointment.arrival || appointment.arrivedAt) {
      await this.audit({
        appointmentId: appointment.id,
        actorUserId: customerId,
        shopId: shop.id,
        action: 'ARRIVAL_SCAN',
        success: false,
        detail: 'Duplicate arrival',
      });
      throw new ConflictException('Arrival already recorded for this booking');
    }

    const now = new Date();
    const [arrival] = await this.prisma.$transaction([
      this.prisma.appointmentArrival.create({
        data: {
          appointmentId: appointment.id,
          customerId,
          shopId: shop.id,
          arrivedAt: now,
          status: 'VERIFIED',
        },
      }),
      this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { arrivedAt: now },
      }),
    ]);

    await this.notificationsService.create({
      userId: shop.ownerId,
      title: 'Customer arrived',
      body: `${appointment.customerName} has arrived for ${appointment.serviceName} at ${appointment.startTime}.`,
      href: '/barber/appointments',
      appointmentId: appointment.id,
    });

    await this.audit({
      appointmentId: appointment.id,
      actorUserId: customerId,
      shopId: shop.id,
      action: 'ARRIVAL_SCAN',
      success: true,
    });

    return {
      appointmentId: appointment.id,
      shopId: shop.id,
      shopName: shop.name,
      arrivedAt: arrival.arrivedAt.toISOString(),
      status: arrival.status,
      startTime: appointment.startTime,
      serviceName: appointment.serviceName,
    };
  }

  /** Customer generates time-limited service-start QR after arrival. */
  async issueServiceStartQr(customerId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, customerId },
    });
    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }
    if (!appointment.arrivedAt) {
      throw new BadRequestException(
        'Scan the shop QR to check in before generating a service QR',
      );
    }
    if (appointment.actualStartAt) {
      throw new ConflictException('Service has already started');
    }
    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Booking is not eligible for service start');
    }

    const issued = issueServiceStartQr(appointment.id);
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        serviceStartQrJti: issued.jti,
        serviceStartQrExpiresAt: issued.expiresAt,
        serviceStartQrConsumedAt: null,
      },
    });

    return {
      appointmentId: appointment.id,
      qrPayload: issued.raw,
      expiresAt: issued.expiresAt.toISOString(),
    };
  }

  /** Barber (shop owner) scans customer service-start QR. */
  async scanServiceStart(ownerId: string, qrPayload: string) {
    const parsed = parseAndVerifyServiceStartQr(qrPayload);
    if (!parsed) {
      await this.audit({
        actorUserId: ownerId,
        action: 'SERVICE_START_SCAN',
        success: false,
        detail: 'Invalid or expired service QR',
      });
      throw new BadRequestException('Invalid or expired service QR code');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      select: { id: true, name: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: parsed.aid, shopId: shop.id },
    });
    if (!appointment) {
      await this.audit({
        actorUserId: ownerId,
        shopId: shop.id,
        action: 'SERVICE_START_SCAN',
        success: false,
        detail: 'Booking not in this shop',
      });
      throw new ForbiddenException('This QR is not for your shop');
    }

    if (!appointment.arrivedAt) {
      throw new BadRequestException('Customer has not checked in yet');
    }
    if (appointment.actualStartAt || appointment.serviceStartQrConsumedAt) {
      await this.audit({
        appointmentId: appointment.id,
        actorUserId: ownerId,
        shopId: shop.id,
        action: 'SERVICE_START_SCAN',
        success: false,
        detail: 'QR already consumed / service started',
      });
      throw new ConflictException('Service start already recorded');
    }
    if (appointment.serviceStartQrJti !== parsed.jti) {
      throw new BadRequestException('Service QR is no longer valid');
    }
    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Booking status does not allow service start');
    }

    const now = new Date();
    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        actualStartAt: now,
        serviceStartQrConsumedAt: now,
        status: AppointmentStatus.IN_PROGRESS,
        serviceStartQrJti: null,
        serviceStartQrExpiresAt: null,
      },
    });

    if (appointment.customerId) {
      await this.notificationsService.create({
        userId: appointment.customerId,
        title: 'Service started',
        body: `Your service at ${shop.name} has started.`,
        href: '/history',
        appointmentId: appointment.id,
      });
    }

    await this.audit({
      appointmentId: appointment.id,
      actorUserId: ownerId,
      shopId: shop.id,
      action: 'SERVICE_START_SCAN',
      success: true,
    });

    return {
      appointmentId: updated.id,
      actualStartAt: updated.actualStartAt!.toISOString(),
      status: updated.status,
      customerName: updated.customerName,
      serviceName: updated.serviceName,
      startTime: updated.startTime,
    };
  }

  /**
   * Idempotent scoring when a booking becomes COMPLETED with actualStartAt.
   */
  async scoreAppointmentIfEligible(appointmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!appointment) {
        return null;
      }
      if (appointment.scoredAt != null) {
        return {
          alreadyScored: true,
          bookingScore: pointsToNumber(appointment.bookingScore),
          basePoints: pointsToNumber(appointment.basePoints),
          punctualityPoints: pointsToNumber(appointment.punctualityPoints),
        };
      }
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        return null;
      }
      if (!appointment.actualStartAt) {
        return null;
      }
      if (appointment.isWalkIn && !appointment.customerId) {
        // Walk-ins without registered customer skip scoring by design.
        return null;
      }

      const shop = await tx.shop.findUnique({
        where: { id: appointment.shopId },
        select: { barberCount: true },
      });

      const breakdown = calculateBookingScore({
        slotDate: appointment.date,
        slotStartTime: appointment.startTime,
        actualStartAt: appointment.actualStartAt,
        barberCount: shop?.barberCount,
      });

      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          basePoints: breakdown.basePoints,
          punctualityPoints: breakdown.punctualityPoints,
          bookingScore: breakdown.bookingScore,
          scoredBarberCount: breakdown.barberTier,
          scoredAt: new Date(),
        },
      });

      return {
        alreadyScored: false,
        bookingScore: pointsToNumber(updated.bookingScore),
        basePoints: pointsToNumber(updated.basePoints),
        punctualityPoints: pointsToNumber(updated.punctualityPoints),
        delayMinutes: breakdown.delayMinutes,
      };
    });
  }

  async getAppointmentVerification(customerId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, customerId },
      select: {
        id: true,
        status: true,
        arrivedAt: true,
        actualStartAt: true,
        basePoints: true,
        punctualityPoints: true,
        bookingScore: true,
        scoredBarberCount: true,
        scoredAt: true,
        startTime: true,
        date: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('Booking not found');
    }
    return {
      appointmentId: appointment.id,
      status: appointment.status,
      arrivedAt: appointment.arrivedAt?.toISOString() ?? null,
      actualStartAt: appointment.actualStartAt?.toISOString() ?? null,
      basePoints: pointsToNumber(appointment.basePoints),
      punctualityPoints: pointsToNumber(appointment.punctualityPoints),
      bookingScore: pointsToNumber(appointment.bookingScore),
      maxBookingScore: maxBookingScore(appointment.scoredBarberCount),
      scoredAt: appointment.scoredAt?.toISOString() ?? null,
      date: formatDateOnly(appointment.date),
      startTime: appointment.startTime,
    };
  }

  /**
   * Shop points leaderboard across all shops, filterable by state/city.
   * Barbers default to their own city/state; admins default to everywhere.
   */
  async getShopLeaderboard(
    userId: string,
    role: UserRole,
    query: { state?: string; city?: string; all?: string },
  ) {
    const myShop =
      role === UserRole.BARBER
        ? await this.prisma.shop.findFirst({
            where: { ownerId: userId },
            select: { id: true, city: true, state: true },
          })
        : null;

    let state = query.state?.trim() || null;
    let city = query.city?.trim() || null;
    if (!state && !city && query.all !== 'true' && myShop) {
      state = myShop.state.trim() || null;
      city = myShop.city.trim() || null;
    }

    const [locations, shops] = await Promise.all([
      this.prisma.shop.findMany({ select: { city: true, state: true } }),
      this.prisma.shop.findMany({
        where: {
          ...(state
            ? { state: { equals: state, mode: 'insensitive' as const } }
            : {}),
          ...(city
            ? { city: { equals: city, mode: 'insensitive' as const } }
            : {}),
        },
        select: { id: true, name: true, city: true, state: true },
      }),
    ]);

    const states = uniqueLocationNames(locations.map((l) => l.state));
    const cities = uniqueLocationNames(
      locations
        .filter(
          (l) => !state || l.state.trim().toLowerCase() === state.toLowerCase(),
        )
        .map((l) => l.city),
    );

    const points = await this.prisma.appointment.groupBy({
      by: ['shopId'],
      where: {
        shopId: { in: shops.map((s) => s.id) },
        bookingScore: { not: null },
      },
      _sum: { bookingScore: true },
      _count: { _all: true },
    });
    const pointsByShop = new Map(
      points.map((row) => [
        row.shopId,
        {
          totalPoints: roundPoints(pointsToNumber(row._sum.bookingScore) ?? 0),
          scored: row._count._all,
        },
      ]),
    );

    const sorted = shops
      .map((s) => ({
        shopId: s.id,
        shopName: s.name,
        city: s.city,
        state: s.state,
        totalPoints: pointsByShop.get(s.id)?.totalPoints ?? 0,
        scoredBookings: pointsByShop.get(s.id)?.scored ?? 0,
        isMine: s.id === myShop?.id,
      }))
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints || a.shopName.localeCompare(b.shopName),
      );

    let lastScore: number | null = null;
    let lastRank = 0;
    const entries = sorted.map((row, index) => {
      if (lastScore === null || row.totalPoints !== lastScore) {
        lastRank = index + 1;
        lastScore = row.totalPoints;
      }
      return { rank: lastRank, ...row };
    });

    return {
      appliedFilter: { state, city },
      myShopId: myShop?.id ?? null,
      myRank: entries.find((e) => e.isMine)?.rank ?? null,
      states,
      cities,
      entries,
    };
  }

  async getWeeklyLeaderboard(ownerId: string, weekMonday?: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      select: { id: true, name: true },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    let weekStart: Date;
    let weekEnd: Date;
    let weekKey: string;

    if (weekMonday) {
      weekStart = slotInstantInBusinessTz(weekMonday, '00:00');
      const nextMonday = (() => {
        const [y, m, d] = weekMonday.split('-').map(Number);
        const utc = new Date(Date.UTC(y, m - 1, d + 7));
        return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
      })();
      weekEnd = new Date(
        slotInstantInBusinessTz(nextMonday, '00:00').getTime() - 1,
      );
      weekKey = weekMonday;
    } else {
      const bounds = weekBoundsContaining(new Date());
      weekStart = bounds.weekStart;
      weekEnd = bounds.weekEnd;
      weekKey = bounds.weekKey;
    }

    const scored = await this.prisma.appointment.findMany({
      where: {
        shopId: shop.id,
        status: AppointmentStatus.COMPLETED,
        scoredAt: { not: null },
        bookingScore: { not: null },
        actualStartAt: { gte: weekStart, lte: weekEnd },
        staffId: { not: null },
      },
      select: {
        staffId: true,
        bookingScore: true,
        punctualityPoints: true,
        staff: {
          select: { id: true, name: true, title: true },
        },
      },
    });

    type Acc = {
      staffId: string;
      staffName: string;
      title: string;
      totalPoints: number;
      eligibleBookings: number;
      punctualitySum: number;
    };

    const byStaff = new Map<string, Acc>();
    for (const row of scored) {
      if (!row.staffId || !row.staff) continue;
      const existing = byStaff.get(row.staffId) ?? {
        staffId: row.staffId,
        staffName: row.staff.name,
        title: row.staff.title,
        totalPoints: 0,
        eligibleBookings: 0,
        punctualitySum: 0,
      };
      existing.totalPoints += pointsToNumber(row.bookingScore) ?? 0;
      existing.eligibleBookings += 1;
      existing.punctualitySum += pointsToNumber(row.punctualityPoints) ?? 0;
      byStaff.set(row.staffId, existing);
    }

    for (const acc of byStaff.values()) {
      acc.totalPoints = roundPoints(acc.totalPoints);
    }

    const sorted = [...byStaff.values()].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.staffName.localeCompare(b.staffName);
    });

    let lastScore: number | null = null;
    let lastRank = 0;
    const entries = sorted.map((row, index) => {
      if (lastScore === null || row.totalPoints !== lastScore) {
        lastRank = index + 1;
        lastScore = row.totalPoints;
      }
      const avgPunctuality =
        row.eligibleBookings > 0
          ? Math.round((row.punctualitySum / row.eligibleBookings) * 10) / 10
          : 0;
      return {
        rank: lastRank,
        staffId: row.staffId,
        staffName: row.staffName,
        title: row.title,
        shopName: shop.name,
        totalPoints: row.totalPoints,
        eligibleBookings: row.eligibleBookings,
        averagePunctualityPoints: avgPunctuality,
      };
    });

    return {
      weekKey,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      shopId: shop.id,
      shopName: shop.name,
      entries,
    };
  }
}
