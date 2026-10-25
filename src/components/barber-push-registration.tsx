import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useSession } from "@/context/session-provider";
import {
  configureNotificationHandler,
  getNotificationHref,
  registerBarberPushNotifications,
} from "@/services/push-notifications";

/**
 * Registers Expo push for barber sessions and routes notification taps to Home.
 */
export function BarberPushRegistration() {
  const { session, user } = useSession();
  const isBarber = user?.role === "BARBER";

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    // expo-notifications response APIs are not available on web.
    if (Platform.OS === "web" || !session || !isBarber) return;

    void registerBarberPushNotifications();

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      const href = getNotificationHref(response.notification) ?? "/";
      router.push(href as never);
    }

    const sub = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        const href = getNotificationHref(event.notification) ?? "/";
        router.push(href as never);
      },
    );

    return () => {
      sub.remove();
    };
  }, [session, isBarber]);

  return null;
}
