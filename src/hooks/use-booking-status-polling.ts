import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";

import { fetchMyBooking, type CustomerBooking } from "@/services/customer-bookings-api";
import { startBookingStatusPoller } from "@/utils/booking-status-poller";

export function useForegroundPolling<T>(
  enabled: boolean,
  fetchStatus: (signal: AbortSignal) => Promise<T>,
  onUpdate: (value: T) => void,
  onError: (error: unknown) => void,
) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      let stop: (() => void) | undefined;
      const start = () => {
        if (stop) return;
        stop = startBookingStatusPoller(
          fetchStatus,
          onUpdate,
          onError,
        );
      };
      const pause = () => {
        stop?.();
        stop = undefined;
      };

      if (AppState.currentState === "active" || AppState.currentState === null) {
        start();
      }
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") start();
        else pause();
      });

      return () => {
        pause();
        subscription.remove();
      };
    }, [enabled, fetchStatus, onUpdate, onError]),
  );
}

export function useBookingStatusPolling(
  bookingId: string | null | undefined,
  enabled: boolean,
  onUpdate: (booking: CustomerBooking) => void,
  onError: (error: unknown) => void,
) {
  const fetchStatus = useCallback((signal: AbortSignal) => {
    if (!bookingId) throw new Error("Booking ID is required.");
    return fetchMyBooking(bookingId, signal);
  }, [bookingId]);

  useForegroundPolling(Boolean(bookingId && enabled), fetchStatus, onUpdate, onError);
}
