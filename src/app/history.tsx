import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchMyBookings,
  getCustomerBookingErrorMessage,
  type CustomerBooking,
} from "@/services/customer-bookings-api";
import type { AppointmentStatus } from "@/services/shop-appointments-api";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatBookingDate(dateKey: string) {
  const formatted = parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (dateKey === toDateKey(new Date())) {
    return `Today, ${formatted}`;
  }
  return formatted;
}

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

function statusMeta(status: AppointmentStatus) {
  switch (status) {
    case "PENDING":
      return { label: "Pending", color: "#FBBF24" };
    case "CONFIRMED":
      return { label: "Confirmed", color: "#60A5FA" };
    case "IN_PROGRESS":
      return { label: "In Progress", color: "#4ADE80" };
    case "COMPLETED":
      return { label: "Completed", color: "#8B8BA7" };
    case "CANCELLED":
      return { label: "Cancelled", color: "#F87171" };
    case "REJECTED":
      return { label: "Rejected", color: "#F87171" };
    default:
      return { label: status, color: "#8B8BA7" };
  }
}

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function CustomerHistoryScreen() {
  const router = useRouter();

  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBookings = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const list = await fetchMyBookings();
      setBookings(list);
    } catch (error) {
      setErrorMessage(getCustomerBookingErrorMessage(error));
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#14141F", "#0C0C14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heading}>History</Text>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadBookings();
                }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading bookings"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : bookings.length === 0 ? (
            <Text style={styles.emptyText}>No bookings yet</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>
                {bookings.length}{" "}
                {bookings.length === 1 ? "booking" : "bookings"} so far
              </Text>

              {bookings.map((booking) => {
                const meta = statusMeta(booking.status);
                return (
                  <View key={booking.id} style={styles.bookingRow}>
                    <Text style={styles.dateText}>
                      {formatBookingDate(booking.date)}
                    </Text>

                    <Text style={styles.detailLine}>
                      <Text style={styles.detailIcon}>🕐 </Text>
                      {formatTime12h(booking.startTime)} -{" "}
                      {formatTime12h(booking.endTime)}
                    </Text>
                    <Text style={styles.detailLine}>
                      <Text style={styles.detailIcon}>🏪 </Text>
                      {booking.shopName}
                    </Text>
                    <Text style={styles.detailLine}>
                      <Text style={styles.detailIcon}>✂️ </Text>
                      {booking.serviceName}
                    </Text>
                    <Text style={styles.detailLine}>
                      <Text style={styles.detailIcon}>💈 </Text>
                      {booking.staffName ?? "Any Available"}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.priceText}>
                        💵 {formatInr(booking.priceInr)}
                      </Text>
                      <Text style={styles.metaDivider}>|</Text>
                      <View style={styles.statusInline}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: meta.color },
                          ]}
                        />
                        <Text
                          style={[styles.statusValue, { color: meta.color }]}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090F",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  subtitle: {
    color: "#8B8BA7",
    fontSize: 14,
    marginBottom: 4,
  },

  loader: {
    marginTop: 32,
    marginBottom: 16,
  },

  emptyText: {
    color: "#8B8BA7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  errorBox: {
    marginTop: 8,
  },

  errorText: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 8,
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  bookingRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  dateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  detailLine: {
    color: "#C9C9D6",
    fontSize: 14,
    marginTop: 4,
  },

  detailIcon: {
    color: "#8B8BA7",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  priceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  metaDivider: {
    color: "#4B4B63",
  },

  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusValue: {
    fontSize: 13,
    fontWeight: "700",
  },
});
