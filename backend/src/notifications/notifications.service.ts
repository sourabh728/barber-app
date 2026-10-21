import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
  appointmentId?: string | null;
  /** When true, also attempt Expo push to the user's registered device. */
  push?: boolean;
  /** Android notification channel id (must exist on device). */
  channelId?: string;
  /** Extra data payload for the client. */
  data?: Record<string, string>;
};

type ExpoPushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        appointmentId: input.appointmentId ?? null,
      },
    });

    if (input.push) {
      void this.sendPushToUser(input.userId, {
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        appointmentId: input.appointmentId ?? null,
        channelId: input.channelId ?? 'booking-requests',
        data: input.data,
      });
    }

    return notification;
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

  async registerPushToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token.trim() },
    });
    return { ok: true as const };
  }

  async clearPushToken(userId: string, token?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });
    if (!user?.expoPushToken) {
      return { ok: true as const };
    }
    if (token && user.expoPushToken !== token.trim()) {
      return { ok: true as const };
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: null },
    });
    return { ok: true as const };
  }

  async sendPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      href?: string | null;
      appointmentId?: string | null;
      channelId?: string;
      data?: Record<string, string>;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });
    const token = user?.expoPushToken?.trim();
    if (!token) {
      return { sent: false as const, reason: 'no_token' as const };
    }

    const message = {
      to: token,
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: payload.channelId ?? 'booking-requests',
      title: payload.title,
      body: payload.body,
      data: {
        type: payload.data?.type ?? 'NEW_BOOKING_REQUEST',
        href: payload.href ?? '/',
        appointmentId: payload.appointmentId ?? '',
        ...payload.data,
      },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        this.logger.warn(
          `Expo push HTTP ${response.status} for user ${userId}`,
        );
        return { sent: false as const, reason: 'http_error' as const };
      }

      const json = (await response.json()) as {
        data?: ExpoPushTicket | ExpoPushTicket[];
      };
      const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
      if (ticket?.status === 'error') {
        this.logger.warn(
          `Expo push error for user ${userId}: ${ticket.message ?? ticket.details?.error}`,
        );
        if (
          ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.message?.includes('not a registered push notification recipient')
        ) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { expoPushToken: null },
          });
        }
        return { sent: false as const, reason: 'expo_error' as const };
      }

      return { sent: true as const };
    } catch (error) {
      this.logger.warn(
        `Expo push failed for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { sent: false as const, reason: 'network' as const };
    }
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
