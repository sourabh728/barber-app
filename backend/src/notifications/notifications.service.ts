import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
  appointmentId?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        appointmentId: input.appointmentId ?? null,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        appointmentId: input.appointmentId ?? null,
      })),
    });
  }

  async listForUser(userId: string, limit = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return notifications.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      href: item.href,
      appointmentId: item.appointmentId,
      readAt: item.readAt,
      createdAt: item.createdAt,
      isRead: Boolean(item.readAt),
    }));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      return null;
    }

    if (existing.readAt) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }
}
