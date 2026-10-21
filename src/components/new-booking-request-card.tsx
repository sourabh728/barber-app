import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { ShopAppointment } from "@/services/shop-appointments-api";

type NewBookingRequestCardProps = {
  appointment: ShopAppointment;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onSuggestSlot: () => void;
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

function formatRequestDate(dateKey: string) {
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

function customerHandle(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "@guest";
  if (parts.length === 1) return `@${parts[0]}`;
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0] ?? "";
  return `@${first}_${lastInitial}`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Barber-facing card for a PENDING booking — Accept / Reject / Suggest next slot.
 */
export function NewBookingRequestCard({
  appointment,
  busy = false,
  onAccept,
  onReject,
  onSuggestSlot,
}: NewBookingRequestCardProps) {
  const name = appointment.customerName.trim() || "Customer";
  const service = appointment.serviceName.trim() || "a service";
  const barberLabel = appointment.staffName?.trim() || "Any available";
  const slotLabel = `${formatTime12h(appointment.startTime)} – ${formatTime12h(appointment.endTime)}`;

  return (
    <View style={styles.card}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>New Booking Request</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Customer details</Text>

        <View style={styles.identityRow}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color="#94A3B8" />
            </View>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.customerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.customerHandle} numberOfLines={1}>
              {customerHandle(name)}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>New Request</Text>
          </View>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.requestLine}>
            {firstName(name)} requests a {service.toLowerCase()}
          </Text>

          <View style={styles.slotBox}>
            <Text style={styles.slotLabel}>Slot requested</Text>
            <Text style={styles.slotValue}>{slotLabel}</Text>
          </View>

          <Text style={styles.metaLine}>{formatRequestDate(appointment.date)}</Text>
          <Text style={styles.metaLine}>Barber: {barberLabel}</Text>
          {appointment.priceInr > 0 ? (
            <Text style={styles.metaLine}>
              ₹{appointment.priceInr.toLocaleString("en-IN")}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={onReject}
            accessibilityRole="button"
            accessibilityLabel="Reject booking request"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel="Accept booking request"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={26} color="#FFFFFF" />
                <Text style={styles.actionLabel}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.suggestBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={onSuggestSlot}
            accessibilityRole="button"
            accessibilityLabel="Suggest next slot"
          >
            <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Suggest{"\n"}next slot</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141820",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A3344",
    marginBottom: 12,
  },
  titleBar: {
    backgroundColor: "#1C2433",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3344",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2A3344",
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  customerHandle: {
    marginTop: 2,
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
  },
  detailBox: {
    backgroundColor: "#1C2433",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3F4B5F",
    padding: 14,
    gap: 10,
  },
  requestLine: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  slotBox: {
    backgroundColor: "#0F141D",
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  slotLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  slotValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  metaLine: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  rejectBtn: {
    backgroundColor: "#DC2626",
  },
  acceptBtn: {
    backgroundColor: "#16A34A",
  },
  suggestBtn: {
    backgroundColor: "#2563EB",
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 14,
  },
  disabled: {
    opacity: 0.55,
  },
});
