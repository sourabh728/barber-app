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
import type { PublicAppSettings } from "@/services/public-settings-api";

type BookingRejectedCardProps = {
  booking: CustomerBooking;
  paymentSettings: PublicAppSettings | null;
  onViewOtherBarbers: () => void;
  onViewOtherSlots: () => void;
};

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
 * Customer-facing panel when a booking request is REJECTED.
 */
export function BookingRejectedCard({
  booking,
  paymentSettings,
  onViewOtherBarbers,
  onViewOtherSlots,
}: BookingRejectedCardProps) {
  const { user } = useSession();
  const displayName = user?.name?.trim() || booking.customerName;
  const paymentMode = paymentSettings?.paymentMode ?? "PAY_AT_SHOP";
  const fee = paymentSettings?.bookingFeeInr ?? 11;

  const bodyCopy =
    paymentMode === "ONLINE_FEE_REST_AT_SHOP"
      ? `But don't worry, you can still get a great cut. Book another barber for that same slot with a small deposit of ₹${fee}, or find another time.`
      : "But don't worry, you can still get a great cut. Book another barber for that same slot, or find another time that works for you.";

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Advance Payment</Text>
      <Text style={styles.subheading}>Booking is out</Text>

      <LinearGradient
        colors={["#B45309", "#EAB308", "#FDE047"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statusCard}
      >
        <View style={styles.profileBlock}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#FDE68A" />
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.handle}>
            User ID: {customerHandle(displayName, user?.email)}
          </Text>
        </View>

        <View style={styles.sadWrap}>
          <Ionicons name="sad-outline" size={64} color="#78350F" />
        </View>

        <Text style={styles.bodyText}>{bodyCopy}</Text>
      </LinearGradient>

      <TouchableOpacity
        onPress={onViewOtherBarbers}
        accessibilityRole="button"
        accessibilityLabel="View other barbers"
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#38BDF8", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionButton}
        >
          <Ionicons name="people-outline" size={18} color="#F8FAFC" />
          <Text style={styles.actionButtonText}>View Other Barbers</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onViewOtherSlots}
        accessibilityRole="button"
        accessibilityLabel="View other slots"
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#4ADE80", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionButton}
        >
          <Ionicons name="calendar-outline" size={18} color="#F8FAFC" />
          <Text style={styles.actionButtonText}>View Other Slots</Text>
        </LinearGradient>
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
  statusCard: {
    borderRadius: 18,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  profileBlock: {
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#78350F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#451A03",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#1C1917",
    fontSize: 20,
    fontWeight: "800",
  },
  handle: {
    color: "#44403C",
    fontSize: 13,
    fontWeight: "600",
  },
  sadWrap: {
    alignItems: "center",
    marginVertical: 10,
  },
  bodyText: {
    color: "#1C1917",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 21,
  },
  actionButton: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
