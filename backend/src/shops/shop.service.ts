import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  StaffStatus,
  UserRole,
} from '../../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { CreateShopStaffDto } from './dto/create-shop-staff.dto';
import {
  AppointmentTabValue,
} from './dto/list-appointments.query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopScheduleDto } from './dto/update-shop-schedule.dto';
import { UpdateShopStaffDto } from './dto/update-shop-staff.dto';

function toDateOnlyUtc(isoDate: string): Date {
  // Parse YYYY-MM-DD as UTC midnight so @db.Date stays stable across TZ.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new BadRequestException(`Invalid date: ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type StaffRecord = {
  id: string;
  shopId: string;
  name: string;
  title: string;
  phone: string;
  status: StaffStatus;
  leaveReturnDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeStaff(staff: StaffRecord) {
  return {
    id: staff.id,
    shopId: staff.shopId,
    name: staff.name,
    title: staff.title,
    phone: staff.phone,
    status: staff.status,
    leaveReturnDate: staff.leaveReturnDate
      ? formatDateOnly(staff.leaveReturnDate)
      : null,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

function resolveStaffLeaveDate(
  status: StaffStatus,
  leaveReturnDate: string | undefined | null,
): Date | null {
  if (status === StaffStatus.ON_LEAVE) {
    if (!leaveReturnDate) {
      throw new BadRequestException(
        'leaveReturnDate is required when status is ON_LEAVE',
      );
    }
    return toDateOnlyUtc(leaveReturnDate);
  }

  return null;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const TAB_STATUSES: Record<AppointmentTabValue, AppointmentStatus[]> = {
  upcoming: [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
  ],
  past: [AppointmentStatus.COMPLETED],
  cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
};

type AppointmentRecord = {
  id: string;
  shopId: string;
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
  staff: { id: string; name: string } | null;
};

function serializeAppointment(appointment: AppointmentRecord) {
  return {
    id: appointment.id,
    shopId: appointment.shopId,
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

function assertTimeOrder(startTime: string, endTime: string) {
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    throw new BadRequestException('startTime and endTime must be HH:mm');
  }

  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    throw new BadRequestException('startTime must be before endTime');
  }
}

function todayUtcDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function assertScheduleOrder(dto: UpdateShopScheduleDto) {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const open = toMinutes(dto.openTime);
  const close = toMinutes(dto.closeTime);
  const lunchStart = toMinutes(dto.lunchStart);
  const lunchEnd = toMinutes(dto.lunchEnd);

  if (open >= close) {
    throw new BadRequestException('Opening time must be before closing time');
  }

  if (lunchStart >= lunchEnd) {
    throw new BadRequestException('Lunch start must be before lunch end');
  }

  if (lunchStart < open || lunchEnd > close) {
    throw new BadRequestException(
      'Lunch break must fall within opening and closing times',
    );
  }
}

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  createShop(createShopDto: CreateShopDto, ownerId: string) {
    return this.prisma.shop.create({
      data: {
        ...createShopDto,
        ownerId,
      },
    });
  }

  private async findOwnerShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  async getMySchedule(ownerId: string) {
    const shop = await this.findOwnerShop(ownerId);
    const holidays = await this.prisma.shopHoliday.findMany({
      where: { shopId: shop.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    return {
      shopId: shop.id,
      openTime: shop.openTime,
      closeTime: shop.closeTime,
      lunchStart: shop.lunchStart,
      lunchEnd: shop.lunchEnd,
      holidays: holidays.map((h) => formatDateOnly(h.date)),
    };
  }

  async updateMySchedule(ownerId: string, dto: UpdateShopScheduleDto) {
    assertScheduleOrder(dto);

    const shop = await this.findOwnerShop(ownerId);
    const holidayDates = dto.holidays.map(toDateOnlyUtc);

    await this.prisma.$transaction(async (tx) => {
      await tx.shop.update({
        where: { id: shop.id },
        data: {
          openTime: dto.openTime,
          closeTime: dto.closeTime,
          lunchStart: dto.lunchStart,
          lunchEnd: dto.lunchEnd,
        },
      });

      await tx.shopHoliday.deleteMany({
        where: { shopId: shop.id },
      });

      if (holidayDates.length > 0) {
        await tx.shopHoliday.createMany({
          data: holidayDates.map((date) => ({
            shopId: shop.id,
            date,
          })),
        });
      }
    });

    return this.getMySchedule(ownerId);
  }

  async updateMyShop(ownerId: string, updateShopDto: UpdateShopDto) {
    const shop = await this.findOwnerShop(ownerId);

    return this.prisma.shop.update({
      where: { id: shop.id },
      data: updateShopDto,
    });
  }

  async updateShop(
    shopId: string,
    updateShopDto: UpdateShopDto,
    userId: string,
    userRole: UserRole,
  ) {
    const shop = await this.prisma.shop.findUnique({
      where: {
        id: shopId,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (userRole === UserRole.BARBER && shop.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own shop');
    }

    return this.prisma.shop.update({
      where: {
        id: shopId,
      },
      data: updateShopDto,
    });
  }

  async listMyStaff(ownerId: string) {
    const shop = await this.findOwnerShop(ownerId);
    const staff = await this.prisma.shopStaff.findMany({
      where: { shopId: shop.id },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });

    return staff.map(serializeStaff);
  }

  async createMyStaff(ownerId: string, dto: CreateShopStaffDto) {
    const shop = await this.findOwnerShop(ownerId);
    const leaveReturnDate = resolveStaffLeaveDate(
      dto.status,
      dto.leaveReturnDate,
    );

    const staff = await this.prisma.shopStaff.create({
      data: {
        shopId: shop.id,
        name: dto.name.trim(),
        title: dto.title.trim(),
        phone: dto.phone.trim(),
        status: dto.status,
        leaveReturnDate,
      },
    });

    return serializeStaff(staff);
  }

  async updateMyStaff(
    ownerId: string,
    staffId: string,
    dto: UpdateShopStaffDto,
  ) {
    const shop = await this.findOwnerShop(ownerId);
    const existing = await this.prisma.shopStaff.findFirst({
      where: { id: staffId, shopId: shop.id },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    const nextStatus = dto.status ?? existing.status;
    const leaveReturnDateProvided = Object.prototype.hasOwnProperty.call(
      dto,
      'leaveReturnDate',
    );
    const leaveInput = leaveReturnDateProvided
      ? dto.leaveReturnDate
      : existing.leaveReturnDate
        ? formatDateOnly(existing.leaveReturnDate)
        : undefined;

    const leaveReturnDate = resolveStaffLeaveDate(nextStatus, leaveInput);

    const staff = await this.prisma.shopStaff.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        leaveReturnDate,
      },
    });

    return serializeStaff(staff);
  }

  async deleteMyStaff(ownerId: string, staffId: string) {
    const shop = await this.findOwnerShop(ownerId);
    const existing = await this.prisma.shopStaff.findFirst({
      where: { id: staffId, shopId: shop.id },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prisma.shopStaff.delete({
      where: { id: existing.id },
    });

    return { id: existing.id, deleted: true };
  }

  private async assertStaffBelongsToShop(
    shopId: string,
    staffId: string | null | undefined,
  ) {
    if (!staffId) {
      return null;
    }

    const staff = await this.prisma.shopStaff.findFirst({
      where: { id: staffId, shopId },
      select: { id: true },
    });

    if (!staff) {
      throw new BadRequestException('Assigned staff was not found for this shop');
    }

    return staff.id;
  }

  /**
   * Blocks overlapping bookings for one concrete barber (staffId).
   *
   * Occupying statuses: any non-CANCELLED / non-REJECTED appointment holds the
   * slot once requested for that barber — PENDING included so two customers
   * cannot both request the same staff time. Null staffId ("Any Available")
   * does not clash with other null-staff rows; conflict is checked only when a
   * specific staff is assigned.
   */
  private async assertNoStaffSlotClash(params: {
    shopId: string;
    staffId: string | null;
    date: Date;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    excludeAppointmentId?: string;
  }) {
    if (!params.staffId) {
      return;
    }

    if (
      params.status === AppointmentStatus.CANCELLED ||
      params.status === AppointmentStatus.REJECTED
    ) {
      return;
    }

    const candidates = await this.prisma.appointment.findMany({
      where: {
        shopId: params.shopId,
        staffId: params.staffId,
        date: params.date,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
        },
        ...(params.excludeAppointmentId
          ? { id: { not: params.excludeAppointmentId } }
          : {}),
      },
      select: { startTime: true, endTime: true },
    });

    // HH:mm strings compare lexicographically; standard interval overlap:
    // startA < endB && startB < endA
    const hasClash = candidates.some(
      (other) =>
        params.startTime < other.endTime && other.startTime < params.endTime,
    );

    if (hasClash) {
      throw new ConflictException(
        'This time slot is already occupied for this barber.',
      );
    }
  }

  async listMyAppointments(
    ownerId: string,
    date?: string,
    tab: AppointmentTabValue = 'upcoming',
  ) {
    const shop = await this.findOwnerShop(ownerId);
    const dateKey = date ?? todayUtcDateOnly();
    const day = toDateOnlyUtc(dateKey);
    const statuses = TAB_STATUSES[tab];

    const appointments = await this.prisma.appointment.findMany({
      where: {
        shopId: shop.id,
        date: day,
        status: { in: statuses },
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    return appointments.map(serializeAppointment);
  }

  /**
   * Aggregates appointment metrics for one calendar day.
   *
   * Definitions (single `serviceName` per appointment today):
   * - totalAppointments: rows that are not CANCELLED / REJECTED
   * - totalServicesCompleted: COMPLETED rows (1 service per appointment)
   * - totalCollectionInr: sum of `priceInr` on COMPLETED rows only
   * - byBarber: same metrics grouped by assigned staff; null staff → "Any Available"
   */
  async getMyDailyReport(ownerId: string, date?: string) {
    const shop = await this.findOwnerShop(ownerId);
    const dateKey = date ?? todayUtcDateOnly();
    const day = toDateOnlyUtc(dateKey);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        shopId: shop.id,
        date: day,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    type BarberBucket = {
      staffId: string | null;
      staffName: string;
      appointments: number;
      servicesCompleted: number;
      revenueInr: number;
    };

    const byStaff = new Map<string, BarberBucket>();
    const unassignedKey = '__any_available__';

    let totalAppointments = 0;
    let totalServicesCompleted = 0;
    let totalCollectionInr = 0;

    for (const appointment of appointments) {
      const isCancelled =
        appointment.status === AppointmentStatus.CANCELLED ||
        appointment.status === AppointmentStatus.REJECTED;
      const isCompleted = appointment.status === AppointmentStatus.COMPLETED;

      if (!isCancelled) {
        totalAppointments += 1;
      }
      if (isCompleted) {
        totalServicesCompleted += 1;
        totalCollectionInr += appointment.priceInr;
      }

      // Skip cancelled/rejected from per-barber breakdown entirely.
      if (isCancelled) {
        continue;
      }

      const key = appointment.staffId ?? unassignedKey;
      let bucket = byStaff.get(key);
      if (!bucket) {
        bucket = {
          staffId: appointment.staffId,
          staffName: appointment.staff?.name ?? 'Any Available',
          appointments: 0,
          servicesCompleted: 0,
          revenueInr: 0,
        };
        byStaff.set(key, bucket);
      }

      bucket.appointments += 1;
      if (isCompleted) {
        bucket.servicesCompleted += 1;
        bucket.revenueInr += appointment.priceInr;
      }
    }

    const byBarber = Array.from(byStaff.values()).sort((a, b) => {
      if (b.revenueInr !== a.revenueInr) {
        return b.revenueInr - a.revenueInr;
      }
      return a.staffName.localeCompare(b.staffName);
    });

    return {
      date: dateKey,
      shopId: shop.id,
      shopName: shop.name,
      overview: {
        totalCollectionInr,
        totalAppointments,
        totalServicesCompleted,
      },
      byBarber,
    };
  }

  async createMyAppointment(ownerId: string, dto: CreateAppointmentDto) {
    const shop = await this.findOwnerShop(ownerId);
    assertTimeOrder(dto.startTime, dto.endTime);

    const staffId = await this.assertStaffBelongsToShop(
      shop.id,
      dto.staffId === undefined ? undefined : dto.staffId,
    );

    const isWalkIn = dto.isWalkIn ?? false;
    const status =
      dto.status ??
      (isWalkIn ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING);
    const date = toDateOnlyUtc(dto.date);

    await this.assertNoStaffSlotClash({
      shopId: shop.id,
      staffId,
      date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status,
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        shopId: shop.id,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone?.trim() || null,
        serviceName: dto.serviceName.trim(),
        staffId,
        priceInr: dto.priceInr,
        status,
        date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isWalkIn,
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    return serializeAppointment(appointment);
  }

  async updateMyAppointment(
    ownerId: string,
    appointmentId: string,
    dto: UpdateAppointmentDto,
  ) {
    const shop = await this.findOwnerShop(ownerId);
    const existing = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, shopId: shop.id },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    const nextStart = dto.startTime ?? existing.startTime;
    const nextEnd = dto.endTime ?? existing.endTime;
    assertTimeOrder(nextStart, nextEnd);

    const staffIdProvided = Object.prototype.hasOwnProperty.call(dto, 'staffId');
    let nextStaffId = existing.staffId;
    if (staffIdProvided) {
      nextStaffId = await this.assertStaffBelongsToShop(
        shop.id,
        dto.staffId ?? null,
      );
    }

    const nextDate =
      dto.date !== undefined ? toDateOnlyUtc(dto.date) : existing.date;
    const nextStatus = dto.status ?? existing.status;

    await this.assertNoStaffSlotClash({
      shopId: shop.id,
      staffId: nextStaffId,
      date: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      status: nextStatus,
      excludeAppointmentId: existing.id,
    });

    const appointment = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(dto.customerName !== undefined
          ? { customerName: dto.customerName.trim() }
          : {}),
        ...(dto.customerPhone !== undefined
          ? { customerPhone: dto.customerPhone.trim() || null }
          : {}),
        ...(dto.serviceName !== undefined
          ? { serviceName: dto.serviceName.trim() }
          : {}),
        ...(staffIdProvided ? { staffId: nextStaffId } : {}),
        ...(dto.priceInr !== undefined ? { priceInr: dto.priceInr } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.date !== undefined ? { date: toDateOnlyUtc(dto.date) } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        ...(dto.isWalkIn !== undefined ? { isWalkIn: dto.isWalkIn } : {}),
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    });

    return serializeAppointment(appointment);
  }
}
