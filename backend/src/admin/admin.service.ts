import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  AppointmentStatus,
  PaymentMode,
  UserRole,
} from '../../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import {
  PLATFORM_ADMIN_EMAIL,
  PLATFORM_ADMIN_NAME,
  PLATFORM_ADMIN_PASSWORD,
} from './admin.constants';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePlatformAdmin();
    await this.ensureSettings();
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

    if (!existing) {
      await this.prisma.user.create({
        data: {
          name: PLATFORM_ADMIN_NAME,
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          emailVerified: true,
        },
      });
      return;
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        role: UserRole.ADMIN,
        emailVerified: true,
        name: existing.name || PLATFORM_ADMIN_NAME,
        // Keep password in sync with the designated admin credential.
        password: hashedPassword,
      },
    });
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
    ] = await Promise.all([
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
          owner: { select: { name: true, email: true } },
          _count: { select: { appointments: true, staff: true } },
        },
      }),
    ]);

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
        totalPoints: scoredAgg._sum.bookingScore ?? 0,
        totalBasePoints: scoredAgg._sum.basePoints ?? 0,
        totalPunctualityPoints: scoredAgg._sum.punctualityPoints ?? 0,
        averageBookingScore: scoredAgg._avg.bookingScore
          ? Math.round(scoredAgg._avg.bookingScore * 10) / 10
          : 0,
        averagePunctuality: scoredAgg._avg.punctualityPoints
          ? Math.round(scoredAgg._avg.punctualityPoints * 10) / 10
          : 0,
      },
      shopList: shops.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        state: s.state,
        ownerName: s.owner.name,
        ownerEmail: s.owner.email,
        bookings: s._count.appointments,
        staff: s._count.staff,
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
        bookingScore: b.bookingScore,
        arrivedAt: b.arrivedAt?.toISOString() ?? null,
        actualStartAt: b.actualStartAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
      paymentModes: Object.values(PaymentMode),
      statuses: Object.values(AppointmentStatus),
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
