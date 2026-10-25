import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  clearPushToken,
  registerPushToken,
} from "@/services/notifications-api";

export const BOOKING_REQUEST_CHANNEL_ID = "booking-requests";
export const BOOKING_UPDATES_CHANNEL_ID = "booking-updates";

let handlerConfigured = false;
let cachedToken: string | null = null;

export function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(BOOKING_REQUEST_CHANNEL_ID, {
    name: "Booking requests",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync(BOOKING_UPDATES_CHANNEL_ID, {
    name: "Booking updates",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function registerBarberPushNotifications(): Promise<string | null> {
  configureNotificationHandler();

  if (Platform.OS === "web") {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId || typeof projectId !== "string") {
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data;
    cachedToken = token;
    await registerPushToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function unregisterBarberPushNotifications() {
  const token = cachedToken;
  cachedToken = null;
  try {
    if (token) {
      await clearPushToken(token);
    } else {
      await clearPushToken();
    }
  } catch {
    // Best-effort cleanup on logout.
  }
}

export function getNotificationHref(
  notification: Notifications.Notification,
): string | null {
  const data = notification.request.content.data as
    | { href?: unknown; url?: unknown }
    | undefined;
  if (typeof data?.href === "string" && data.href.trim()) {
    return data.href;
  }
  if (typeof data?.url === "string" && data.url.trim()) {
    return data.url;
  }
  return null;
}
