import { api } from "./api";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  appointmentId: string | null;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export async function fetchNotifications(limit = 50) {
  const response = await api.get<AppNotification[]>("/notifications", {
    params: { limit },
  });
  return response.data;
}

export async function fetchUnreadNotificationCount() {
  const response = await api.get<{ count: number }>("/notifications/unread-count");
  return response.data.count;
}

export async function markNotificationRead(id: string) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch("/notifications/read-all");
  return response.data;
}
