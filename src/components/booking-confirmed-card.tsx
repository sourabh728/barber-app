import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSession } from "@/context/session-provider";
import type { CustomerBooking } from "@/services/customer-bookings-api";
import {
  formatPaymentLabel,
  type PublicAppSettings,
} from "@/services/public-settings-api";

type BookingConfirmedCardProps = {
  booking: CustomerBooking;
  paymentSettings: PublicAppSettings | null;
  onViewHistory: () => void;
  onPrimaryAction: () => void;
  primaryLabel?: string;
};

function formatTime12h(time24: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time24);
  if (!match) return time24;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

function formatConfirmDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function arrivalHint(startTime: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return null;
  let total = Number(match[1]) * 60 + Number(match[2]) - 5;
  if (total < 0) total += 24 * 60;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return formatTime12h(`${hh}:${mm}`);
}

function customerHandle(fullName: string, email?: string | null) {
  if (email?.includes("@")) {
    return `@${email.split("@")[0]}`;
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "@guest";
  if (parts.length === 1) return `@${parts[0]}`;
  return `@${parts[0]}${parts[parts.length - 1]}`;
}

/**
 * Customer-facing confirmation panel when a booking is CONFIRMED.
 */
export function BookingConfirmedCard({
  booking,
  paymentSettings,
  onViewHistory,
  onPrimaryAction,
  primaryLabel = "Scan shop QR",
}: BookingConfirmedCardProps) {
  const { user } = useSession();
  const displayName = user?.name?.trim() || booking.customerName;
  const arriveBy = arrivalHint(booking.startTime);
  const paymentLine = formatPaymentLabel(paymentSettings, booking.priceInr);
  const paymentMode = paymentSettings?.paymentMode ?? "PAY_AT_SHOP";

  const statusLines = [
    "Request accepted",
    "Booking confirmed",
    `Slot confirmed: ${formatTime12h(booking.startTime)} – ${formatTime12h(booking.endTime)}`,
    `Date: ${formatConfirmDate(booking.date)}`,
    paymentMode === "ONLINE_FEE_REST_AT_SHOP"
      ? `Payment: ${paymentLine}`
      : `Payment: pay at shop · ${paymentLine}`,
    arriveBy
      ? `Please arrive by ${arriveBy} (for ${formatTime12h(booking.startTime)} slot)`
      : `Shop: ${booking.shopName}`,
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Booking Confirmation</Text>
      <Text style={styles.subheading}>
        {paymentMode === "ONLINE_FEE_REST_AT_SHOP"
          ? "Your booking is confirmed"
          : "Your booking is confirmed"}
      </Text>

      <View style={styles.profileBlock}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#86EFAC" />
          </View>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.handle}>
          User ID: {customerHandle(displayName, user?.email)}
        </Text>
      </View>

      <LinearGradient
        colors={["#166534", "#4ADE80", "#A3E635"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statusCard}
      >
        <View style={styles.checkWrap}>
          <Ionicons name="checkmark-circle" size={56} color="#ECFDF5" />
        </View>

        {statusLines.map((line) => (
          <Text key={line} style={styles.statusLine}>
            [{line.toUpperCase()}]
          </Text>
        ))}

        <View style={styles.footerStrip}>
          <Text style={styles.footerText}>
            Please arrive on time for excellent service. See you at{" "}
            {booking.shopName}!
          </Text>
        </View>
      </LinearGradient>

      <TouchableOpacity
        style={styles.pillButton}
        onPress={onViewHistory}
        accessibilityRole="button"
        accessibilityLabel="View booking history"
      >
        <Text style={styles.pillButtonText}>View booking history</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pillButton}
        onPress={onPrimaryAction}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text style={styles.pillButtonText}>{primaryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 8,
  },
  heading: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subheading: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -4,
  },
  profileBlock: {
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#4ADE80",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },
  handle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 18,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  checkWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  statusLine: {
    color: "#052E16",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  footerStrip: {
    marginTop: 8,
    marginHorizontal: -16,
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 17,
  },
  pillButton: {
    backgroundColor: "#BFDBFE",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  pillButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
