import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '../../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type CustomerAppointmentRecord = {
  id: string;
  shopId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  staffId: string | null;
  priceInr: number;
  status: AppointmentStatus;
  date: Date;
  startTime: string;
  endTime: string;
  isWalkIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  shop: { id: string; name: string };
  staff: { id: string; name: string } | null;
};

function serializeCustomerAppointment(appointment: CustomerAppointmentRecord) {
  return {
    id: appointment.id,
    shopId: appointment.shopId,
    shopName: appointment.shop.name,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone,
    serviceName: appointment.serviceName,
    staffId: appointment.staffId,
    staffName: appointment.staff?.name ?? null,
    priceInr: appointment.priceInr,
    status: appointment.status,
    date: formatDateOnly(appointment.date),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    isWalkIn: appointment.isWalkIn,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Which appointments belong to the signed-in customer.
   *
   * `customerId` is the primary mechanism: a booking made by a registered
   * customer points at their user row. Because barber-created appointments
   * only capture free-text customer details, we additionally claim unassigned
   * rows (`customerId IS NULL`) whose `customerPhone` matches the customer's
   * own unique phone number. Rows already attributed to a different customer
   * are never matched by phone.
   */
  private async buildOwnedAppointmentsFilter(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const phone = user.phone?.trim();

    if (!phone) {
      return { customerId: user.id };
    }

    return {
      OR: [
        { customerId: user.id },
        { customerId: null, customerPhone: phone },
      ],
    };
  }

  /** Full booking history for the signed-in customer, newest first. */
  async listMyAppointments(userId: string, status?: AppointmentStatus) {
    const owned = await this.buildOwnedAppointmentsFilter(userId);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...owned,
        ...(status ? { status } : {}),
      },
      include: {
        shop: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return appointments.map(serializeCustomerAppointment);
  }

  /**
   * Profile counters for the signed-in customer.
   *
   * - completedBookings: appointments marked COMPLETED
   * - totalBookings: every appointment ever attributed to them, including
   *   cancelled and rejected ones, so it matches the History screen length
   */
  async getMyStats(userId: string) {
    const owned = await this.buildOwnedAppointmentsFilter(userId);

    const [completedBookings, totalBookings] = await Promise.all([
      this.prisma.appointment.count({
        where: { ...owned, status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.appointment.count({ where: owned }),
    ]);

    return { completedBookings, totalBookings };
  }
}
