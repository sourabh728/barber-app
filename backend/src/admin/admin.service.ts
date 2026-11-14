import {
    BadRequestException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import {
    AppointmentStatus,
    PaymentMode,
    UserRole,
} from '../../generated/prisma/enums';

export type AdminAlertSummary = {
  id: string;
  type: string;
  level: string;
  source: string;
  title: string;
  message: string;
  route: string | null;
  userId: string | null;
  active: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
};

export function buildAlertSummary(alert: {
  id: string;
  type: string;
  level: string;
  source: string;
  title: string;
  message: string;
  route: string | null;
  userId: string | null;
  createdAt: Date | string;
  acknowledgedAt: Date | string | null;
}): AdminAlertSummary {
  return {
    id: alert.id,
    type: alert.type,
    level: alert.level,
    source: alert.source,
    title: alert.title,
    message: alert.message,
    route: alert.route ?? null,
    userId: alert.userId ?? null,
    active: !alert.acknowledgedAt,
    createdAt: new Date(alert.createdAt).toISOString(),
    acknowledgedAt: alert.acknowledgedAt
      ? new Date(alert.acknowledgedAt).toISOString()
      : null,
  };
}

import { PrismaService } from '../prisma/prisma.service';
import { buildShopQrValue } from '../verification/qr-tokens';
import { pointsToNumber, roundPoints } from '../verification/scoring';
import {
    PLATFORM_ADMIN_EMAIL,
    PLATFORM_ADMIN_NAME,
    PLATFORM_ADMIN_PASSWORD,
} from './admin.constants';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

function pts(value: { toNumber(): number } | number | null | undefined): number {
  return roundPoints(pointsToNumber(value) ?? 0);
}

function toDateOnlyUtc(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.slice(0, 10));
  if (!match) {
    throw new BadRequestException('Dates must be YYYY-MM-DD.');
  }
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePlatformAdmin();
    await this.ensureSettings();
  }

  async listShopQrCodes() {
    const codes = await this.prisma.shopQrCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { shop: { select: { id: true, name: true } } },
    });
    return codes.map((c) => ({
      id: c.id,
      name: c.name,
      qrPayload: buildShopQrValue(c.token),
      claimed: Boolean(c.shopId),
      shopName: c.shop?.name ?? null,
      claimedAt: c.claimedAt,
      createdAt: c.createdAt,
    }));
  }

  async getShopQrCodeSvg(id: string) {
    const code = await this.prisma.shopQrCode.findUnique({ where: { id } });
    if (!code) {
      throw new NotFoundException('QR code not found.');
    }
    return QRCode.toString(buildShopQrValue(code.token), {
      type: 'svg',
      margin: 1,
      width: 180,
    });
  }

  async createShopQrCode(name: string) {
    const code = await this.prisma.shopQrCode.create({ data: { name } });
    return {
      id: code.id,
      name: code.name,
      qrPayload: buildShopQrValue(code.token),
      claimed: false,
      shopName: null,
      claimedAt: null,
      createdAt: code.createdAt,
    };
  }

  async deleteShopQrCode(id: string) {
    const code = await this.prisma.shopQrCode.findUnique({ where: { id } });
    if (!code) {
      throw new NotFoundException('QR code not found.');
    }
    if (code.shopId) {
      throw new BadRequestException(
        'This QR is already linked to a shop and cannot be deleted.',
      );
    }
    await this.prisma.shopQrCode.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureSettings() {
    await this.prisma.appSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  private async ensurePlatformAdmin() {
    const email = PLATFORM_ADMIN_EMAIL;
    const hashedPassword = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 10);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    // Wipe any prior customer/barber identity for this email so login
    // always returns a clean ADMIN (no leftover bookings/shops).
    if (existing && existing.role !== UserRole.ADMIN) {
      await this.prisma.$transaction(async (tx) => {
        await tx.notification.deleteMany({ where: { userId: existing.id } });
        await tx.appointment.deleteMany({ where: { customerId: existing.id } });
        await tx.shop.deleteMany({ where: { ownerId: existing.id } });
        await tx.user.delete({ where: { id: existing.id } });
      });
    } else if (existing) {
      await this.prisma.user.update({
        where: { email },
        data: {
          role: UserRole.ADMIN,
          emailVerified: true,
          name: PLATFORM_ADMIN_NAME,
          password: hashedPassword,
        },
      });
      return;
    }

    await this.prisma.user.create({
      data: {
        name: PLATFORM_ADMIN_NAME,
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });
  }

  async getAlerts() {
    const alerts = await this.prisma.systemAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return alerts.map((alert) => buildAlertSummary(alert));
  }

  async reportAlert(input: {
    type?: 'HEALTH_CHECK' | 'API_ERROR' | 'PAYMENT_ERROR' | 'BOOKING_ERROR' | 'AUTH_ERROR' | 'SYSTEM_ERROR';
    level?: 'INFO' | 'WARNING' | 'CRITICAL';
    source?: 'CUSTOMER' | 'BARBER' | 'ADMIN' | 'SYSTEM';
    title?: string;
    message?: string;
    route?: string | null;
    userId?: string | null;
  }) {
    const payload = {
      type: input.type ?? 'API_ERROR',
      level: input.level ?? 'WARNING',
      source: input.source ?? 'SYSTEM',
      title: input.title ?? 'System alert',
      message: input.message ?? 'No details provided.',
      route: input.route ?? null,
      userId: input.userId ?? null,
    };

    const alert = await this.prisma.systemAlert.create({ data: payload });
    return buildAlertSummary(alert);
  }

  async acknowledgeAlert(id: string) {
    const existing = await this.prisma.systemAlert.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Alert not found.');
    }

    const updated = await this.prisma.systemAlert.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });

    return buildAlertSummary(updated);
  }

  async getSettings() {
    return this.ensureAndGetSettings();
  }

  /** Public slice for apps (maintenance banner + payment policy). */
  async getPublicSettings() {
    const s = await this.ensureAndGetSettings();
    return {
      maintenanceEnabled: s.maintenanceEnabled,
      maintenanceMessage: s.maintenanceMessage,
      maintenanceUntil: s.maintenanceUntil,
      paymentMode: s.paymentMode,
      bookingFeeInr: s.bookingFeeInr,
      payoutAccountName: s.payoutAccountName,
      payoutUpiId: s.payoutUpiId,
      // Do not expose full bank account number publicly — last 4 only.
      payoutBankName: s.payoutBankName,
      payoutAccountLast4: s.payoutAccountNumber
        ? s.payoutAccountNumber.slice(-4)
        : null,
      payoutIfsc: s.payoutIfsc,
    };
  }

  async updateSettings(dto: UpdateAdminSettingsDto) {
    await this.ensureSettings();
    const updated = await this.prisma.appSettings.update({
      where: { id: 'default' },
      data: {
        ...(dto.maintenanceEnabled !== undefined
          ? { maintenanceEnabled: dto.maintenanceEnabled }
          : {}),
        ...(dto.maintenanceMessage !== undefined
          ? { maintenanceMessage: dto.maintenanceMessage.trim() }
          : {}),
        ...(dto.maintenanceUntil !== undefined
          ? {
              maintenanceUntil: dto.maintenanceUntil
                ? new Date(dto.maintenanceUntil)
                : null,
            }
          : {}),
        ...(dto.paymentMode !== undefined
          ? { paymentMode: dto.paymentMode }
          : {}),
        ...(dto.bookingFeeInr !== undefined
          ? { bookingFeeInr: dto.bookingFeeInr }
          : {}),
        ...(dto.payoutAccountName !== undefined
          ? {
              payoutAccountName: dto.payoutAccountName?.trim() || null,
            }
          : {}),
        ...(dto.payoutUpiId !== undefined
          ? { payoutUpiId: dto.payoutUpiId?.trim() || null }
          : {}),
        ...(dto.payoutBankName !== undefined
          ? { payoutBankName: dto.payoutBankName?.trim() || null }
          : {}),
        ...(dto.payoutAccountNumber !== undefined
          ? {
              payoutAccountNumber: dto.payoutAccountNumber?.trim() || null,
            }
          : {}),
        ...(dto.payoutIfsc !== undefined
          ? { payoutIfsc: dto.payoutIfsc?.trim()?.toUpperCase() || null }
          : {}),
      },
    });
    return this.serializeSettings(updated);
  }

  async getOverview() {
    const [
      shopCount,
      customerCount,
      barberCount,
      bookingCounts,
      scoredAgg,
      recentBookings,
      shops,
      detailedShops,
      customerRows,
    ] = (await Promise.all([
      this.prisma.shop.count(),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.BARBER } }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.appointment.aggregate({
        where: { bookingScore: { not: null } },
        _sum: { bookingScore: true, basePoints: true, punctualityPoints: true },
        _count: { _all: true },
        _avg: { bookingScore: true, punctualityPoints: true },
      }),
      this.prisma.appointment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          status: true,
          serviceName: true,
          customerName: true,
          date: true,
          startTime: true,
          bookingScore: true,
          arrivedAt: true,
          actualStartAt: true,
          createdAt: true,
          shop: { select: { id: true, name: true } },
        },
      }),
      this.prisma.shop.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          owner: { select: { id: true, name: true, email: true, phone: true } },
          _count: { select: { appointments: true, staff: true } },
        },
      }),
      this.prisma.shop.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          pincode: true,
          phone: true,
          email: true,
          openTime: true,
          closeTime: true,
          lunchStart: true,
          lunchEnd: true,
          barberCount: true,
          owner: { select: { id: true, name: true, email: true, phone: true } },
          createdAt: true,
          updatedAt: true,
          holidays: { select: { date: true }, orderBy: { date: 'asc' } },
          staff: {
            select: {
              id: true,
              name: true,
              title: true,
              phone: true,
              status: true,
              leaveReturnDate: true,
              awayUntil: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { name: 'asc' },
          },
          services: {
            select: {
              id: true,
              name: true,
              priceInr: true,
              durationMin: true,
              active: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { appointments: true, staff: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { appointments: true } },
          appointments: {
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: {
              id: true,
              status: true,
              serviceName: true,
              priceInr: true,
              date: true,
              startTime: true,
              createdAt: true,
              shop: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ])) as [
      number,
      number,
      number,
      Array<{ status: AppointmentStatus; _count: { _all: number } }>,
      {
        _sum: {
          bookingScore: number | null;
          basePoints: number | null;
          punctualityPoints: number | null;
        };
        _count: { _all: number };
        _avg: { bookingScore: number | null; punctualityPoints: number | null };
      },
      Array<{
        id: string;
        status: AppointmentStatus;
        serviceName: string;
        customerName: string;
        date: Date;
        startTime: string;
        bookingScore: number | null;
        arrivedAt: Date | null;
        actualStartAt: Date | null;
        createdAt: Date;
        shop: { id: string; name: string };
      }>,
      Array<{
        id: string;
        name: string;
        city: string | null;
        state: string | null;
        address: string | null;
        owner: { id: string; name: string; email: string; phone: string | null };
        _count: { appointments: number; staff: number };
      }>,
      Array<{
        id: string;
        name: string;
        city: string | null;
        state: string | null;
        address: string | null;
        pincode: string | null;
        phone: string | null;
        email: string | null;
        openTime: string;
        closeTime: string;
        lunchStart: string;
        lunchEnd: string;
        barberCount: number;
        owner: { id: string; name: string; email: string; phone: string | null };
        createdAt: Date;
        updatedAt: Date;
        holidays: { date: Date }[];
        staff: Array<{
          id: string;
          name: string;
          title: string | null;
          phone: string | null;
          status: string;
          leaveReturnDate: Date | null;
          awayUntil: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>;
        services: Array<{
          id: string;
          name: string;
          priceInr: number;
          durationMin: number;
          active: boolean;
          sortOrder: number | null;
        }>;
        _count: { appointments: number; staff: number };
      }>,
      Array<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        _count: { appointments: number };
        appointments: Array<{
          id: string;
          status: AppointmentStatus;
          serviceName: string;
          priceInr: number;
          date: Date;
          startTime: string;
          createdAt: Date;
          shop: { id: string; name: string };
        }>;
      }>,
    ];

    const shopPoints = await this.prisma.appointment.groupBy({
      by: ['shopId'],
      where: { bookingScore: { not: null } },
      _sum: { bookingScore: true, basePoints: true, punctualityPoints: true },
      _count: { _all: true },
    });
    const pointsByShop = new Map(
      shopPoints.map((row) => [
        row.shopId,
        {
          totalPoints: pts(row._sum.bookingScore),
          basePoints: pts(row._sum.basePoints),
          punctualityPoints: pts(row._sum.punctualityPoints),
          scoredBookings: row._count._all,
        },
      ]),
    );

    const byStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REJECTED: 0,
    };
    let totalBookings = 0;
    for (const row of bookingCounts) {
      byStatus[row.status] = row._count._all;
      totalBookings += row._count._all;
    }

    const shopList = shops.map((s) => {
      const points = pointsByShop.get(s.id) ?? {
        totalPoints: 0,
        basePoints: 0,
        punctualityPoints: 0,
        scoredBookings: 0,
      };
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        state: s.state,
        address: s.address,
        ownerName: s.owner.name,
        ownerEmail: s.owner.email,
        ownerPhone: s.owner.phone,
        bookings: s._count.appointments,
        staff: s._count.staff,
        totalPoints: points.totalPoints,
        basePoints: points.basePoints,
        punctualityPoints: points.punctualityPoints,
        scoredBookings: points.scoredBookings,
      };
    });

    const shopDirectory = detailedShops.map((shop) => {
      const points = pointsByShop.get(shop.id) ?? {
        totalPoints: 0,
        basePoints: 0,
        punctualityPoints: 0,
        scoredBookings: 0,
      };

      return {
        id: shop.id,
        name: shop.name,
        city: shop.city,
        state: shop.state,
        address: shop.address,
        pincode: shop.pincode,
        phone: shop.phone,
        email: shop.email,
        owner: shop.owner
          ? {
              id: shop.owner.id,
              name: shop.owner.name,
              email: shop.owner.email,
              phone: shop.owner.phone,
            }
          : null,
        openTime: shop.openTime,
        closeTime: shop.closeTime,
        lunchStart: shop.lunchStart,
        lunchEnd: shop.lunchEnd,
        barberCount: shop.barberCount,
        holidayDates: shop.holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
        staff: shop.staff.map((member) => ({
          id: member.id,
          name: member.name,
          title: member.title,
          phone: member.phone,
          status: member.status,
          leaveReturnDate: member.leaveReturnDate?.toISOString().slice(0, 10) ?? null,
          awayUntil: member.awayUntil?.toISOString() ?? null,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        })),
        services: shop.services.map((service) => ({
          id: service.id,
          name: service.name,
          priceInr: service.priceInr,
          durationMin: service.durationMin,
          active: service.active,
          sortOrder: service.sortOrder,
        })),
        bookings: shop._count.appointments,
        totalPoints: points.totalPoints,
        basePoints: points.basePoints,
        punctualityPoints: points.punctualityPoints,
        scoredBookings: points.scoredBookings,
        createdAt: shop.createdAt.toISOString(),
        updatedAt: shop.updatedAt.toISOString(),
      };
    });

    const customerDirectory = (customerRows ?? []).map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: null,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      bookingCount: customer._count.appointments,
      lastBookingAt:
        customer.appointments[0]?.createdAt?.toISOString() ?? null,
      bookings: customer.appointments.map((booking) => ({
        id: booking.id,
        status: booking.status,
        serviceName: booking.serviceName,
        priceInr: booking.priceInr,
        date: booking.date.toISOString().slice(0, 10),
        startTime: booking.startTime,
        createdAt: booking.createdAt.toISOString(),
        shopName: booking.shop.name,
        shopId: booking.shop.id,
      })),
    }));

    return {
      shops: shopCount,
      customers: customerCount,
      barbers: barberCount,
      bookings: {
        total: totalBookings,
        byStatus,
      },
      points: {
        scoredBookings: scoredAgg._count._all,
        totalPoints: pts(scoredAgg._sum.bookingScore),
        totalBasePoints: pts(scoredAgg._sum.basePoints),
        totalPunctualityPoints: pts(scoredAgg._sum.punctualityPoints),
        averageBookingScore: pts(scoredAgg._avg.bookingScore),
        averagePunctuality: pts(scoredAgg._avg.punctualityPoints),
      },
      shopList,
      shopDirectory,
      customerDirectory,
      shopPointsLeaderboard: [...shopList]
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((s, index) => ({
          rank: index + 1,
          id: s.id,
          name: s.name,
          city: s.city,
          totalPoints: s.totalPoints,
          scoredBookings: s.scoredBookings,
          bookings: s.bookings,
        })),
      recentActivity: recentBookings.map((b) => ({
        id: b.id,
        status: b.status,
        serviceName: b.serviceName,
        customerName: b.customerName,
        shopName: b.shop.name,
        shopId: b.shop.id,
        date: b.date.toISOString().slice(0, 10),
        startTime: b.startTime,
        bookingScore: pointsToNumber(b.bookingScore),
        arrivedAt: b.arrivedAt?.toISOString() ?? null,
        actualStartAt: b.actualStartAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
      paymentModes: Object.values(PaymentMode),
      statuses: Object.values(AppointmentStatus),
    };
  }

  /** Date-range report: shop names, booking counts, payment totals, points. */
  async getBookingsReport(fromKey: string, toKey: string) {
    const from = toDateOnlyUtc(fromKey);
    const to = toDateOnlyUtc(toKey);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('"from" must be on or before "to".');
    }

    const settings = await this.ensureAndGetSettings();
    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      select: {
        id: true,
        shopId: true,
        status: true,
        priceInr: true,
        bookingScore: true,
        shop: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    type ShopAgg = {
      shopId: string;
      shopName: string;
      city: string;
      state: string;
      bookings: number;
      byStatus: Record<string, number>;
      paymentTotalInr: number;
      points: number;
      scoredBookings: number;
    };

    const byShop = new Map<string, ShopAgg>();
    const emptyStatus = (): Record<string, number> => ({
      PENDING: 0,
      CONFIRMED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REJECTED: 0,
    });

    let totalBookings = 0;
    let paymentTotalInr = 0;
    let totalPoints = 0;
    const totalsByStatus = emptyStatus();

    for (const appt of appointments) {
      totalBookings += 1;
      paymentTotalInr += appt.priceInr;
      totalsByStatus[appt.status] = (totalsByStatus[appt.status] ?? 0) + 1;
      if (appt.bookingScore != null) {
        totalPoints += pointsToNumber(appt.bookingScore) ?? 0;
      }

      let row = byShop.get(appt.shopId);
      if (!row) {
        row = {
          shopId: appt.shop.id,
          shopName: appt.shop.name,
          city: appt.shop.city,
          state: appt.shop.state,
          bookings: 0,
          byStatus: emptyStatus(),
          paymentTotalInr: 0,
          points: 0,
          scoredBookings: 0,
        };
        byShop.set(appt.shopId, row);
      }
      row.bookings += 1;
      row.byStatus[appt.status] = (row.byStatus[appt.status] ?? 0) + 1;
      row.paymentTotalInr += appt.priceInr;
      if (appt.bookingScore != null) {
        row.points += pointsToNumber(appt.bookingScore) ?? 0;
        row.scoredBookings += 1;
      }
    }

    const billableCount =
      (totalsByStatus.PENDING ?? 0) +
      (totalsByStatus.CONFIRMED ?? 0) +
      (totalsByStatus.IN_PROGRESS ?? 0) +
      (totalsByStatus.COMPLETED ?? 0);

    const estimatedOnlineFeesInr =
      settings.paymentMode === PaymentMode.ONLINE_FEE_REST_AT_SHOP
        ? settings.bookingFeeInr * billableCount
        : settings.paymentMode === PaymentMode.PERCENTAGE_ONLINE_REST_AT_SHOP
          ? Array.from(byShop.values()).reduce((sum, shopRow) => {
              if (!shopRow.bookings) return sum;
              return sum + shopRow.paymentTotalInr * (settings.bookingFeeInr / 100);
            }, 0)
          : 0;

    const shops = [...byShop.values()].sort((a, b) => b.bookings - a.bookings);

    return {
      from: fromKey.slice(0, 10),
      to: toKey.slice(0, 10),
      paymentMode: settings.paymentMode,
      bookingFeeInr: settings.bookingFeeInr,
      totals: {
        bookings: totalBookings,
        byStatus: totalsByStatus,
        paymentTotalInr,
        estimatedOnlineFeesInr,
        points: roundPoints(totalPoints),
        shopsWithBookings: shops.length,
      },
      shops: shops.map((s) => ({ ...s, points: roundPoints(s.points) })),
    };
  }

  private async ensureAndGetSettings() {
    await this.ensureSettings();
    const settings = await this.prisma.appSettings.findUniqueOrThrow({
      where: { id: 'default' },
    });
    return this.serializeSettings(settings);
  }

  private serializeSettings(s: {
    id: string;
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    maintenanceUntil: Date | null;
    paymentMode: PaymentMode;
    bookingFeeInr: number;
    payoutAccountName: string | null;
    payoutUpiId: string | null;
    payoutBankName: string | null;
    payoutAccountNumber: string | null;
    payoutIfsc: string | null;
    updatedAt: Date;
  }) {
    return {
      id: s.id,
      maintenanceEnabled: s.maintenanceEnabled,
      maintenanceMessage: s.maintenanceMessage,
      maintenanceUntil: s.maintenanceUntil?.toISOString() ?? null,
      paymentMode: s.paymentMode,
      bookingFeeInr: s.bookingFeeInr,
      payoutAccountName: s.payoutAccountName,
      payoutUpiId: s.payoutUpiId,
      payoutBankName: s.payoutBankName,
      payoutAccountNumber: s.payoutAccountNumber,
      payoutIfsc: s.payoutIfsc,
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
