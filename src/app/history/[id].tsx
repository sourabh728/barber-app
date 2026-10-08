import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState , useMemo} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { CancelBookingDialog } from "@/components/cancel-booking-dialog";
import {
  cancelMyBooking,
  fetchMyBooking,
  getCustomerBookingErrorMessage,
  type CustomerBooking,
} from "@/services/customer-bookings-api";
import type { AppointmentStatus } from "@/services/shop-appointments-api";
import { showAppAlert } from "@/utils/app-alert";

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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (dateKey === toDateKey(new Date())) {
    return `Today · ${formatted}`;
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

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function statusMeta(status: AppointmentStatus, mutedColor: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Waiting for approval",
        color: "#FBBF24",
        bannerTitle: "Your request has been sent",
        bannerBody:
          "Please wait while the shop reviews your booking. You’ll be notified when they accept or decline it.",
      };
    case "CONFIRMED":
      return {
        label: "Approved",
        color: "#60A5FA",
        bannerTitle: "Appointment confirmed",
        bannerBody:
          "Your request was accepted. Please arrive on time for your booking.",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        color: "#4ADE80",
        bannerTitle: "Service in progress",
        bannerBody: "Your appointment is currently underway.",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        color: mutedColor,
        bannerTitle: "Visit completed",
        bannerBody: "This booking has been completed.",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        color: "#F87171",
        bannerTitle: "Booking cancelled",
        bannerBody: "This request is no longer active.",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        color: "#F87171",
        bannerTitle: "Request declined",
        bannerBody:
          "The shop declined this request. You can book another time from Home.",
      };
    default:
      return {
        label: status,
        color: mutedColor,
        bannerTitle: "Request details",
        bannerBody: "",
      };
  }
}

function DetailRow({
  icon,
  label,
  value,
  styles,
  accentColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  styles: Record<string, object>;
  accentColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={accentColor} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingRequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      setErrorMessage("Request not found.");
      setBooking(null);
      setIsLoading(false);
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      const data = await fetchMyBooking(bookingId);
      setBooking(data);
    } catch (error) {
      setBooking(null);
      setErrorMessage(getCustomerBookingErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      void loadBooking();
    }, [loadBooking]),
  );

  const runCancel = async () => {
    if (!booking || cancelling) return;
    setCancelling(true);
    try {
      const updated = await cancelMyBooking(booking.id);
      setBooking(updated);
      setCancelDialogVisible(false);
    } catch (error) {
      showAppAlert("Could not cancel", getCustomerBookingErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  const openCancelDialog = () => {
    if (!booking || cancelling) return;
    setCancelDialogVisible(true);
  };

  const meta = booking
    ? statusMeta(booking.status, colors.textSecondary)
    : null;
  const canCancel =
    booking?.status === "PENDING" || booking?.status === "CONFIRMED";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.backgroundCard, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/history")}
              accessibilityRole="button"
              accessibilityLabel="Back to history"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heading}>Request details</Text>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage || !booking || !meta ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {errorMessage || "Request not found."}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadBooking();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.statusBanner,
                  booking.status === "PENDING"
                    ? styles.statusBannerPending
                    : null,
                ]}
              >
                <View style={styles.statusBannerTop}>
                  <View
                    style={[styles.statusDot, { backgroundColor: meta.color }]}
                  />
                  <Text style={[styles.statusLabel, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
                <Text style={styles.bannerTitle}>{meta.bannerTitle}</Text>
                {meta.bannerBody ? (
                  <Text style={styles.bannerBody}>{meta.bannerBody}</Text>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>Booking summary</Text>

              <DetailRow
                icon="storefront-outline"
                label="Shop"
                value={booking.shopName}
                styles={styles}
                accentColor={colors.accent}
              />
              <DetailRow
                icon="cut-outline"
                label="Barber"
                value={booking.staffName ?? "Any available"}
                styles={styles}
                accentColor={colors.accent}
              />
              <DetailRow
                icon="list-outline"
                label="Services"
                value={booking.serviceName}
                styles={styles}
                accentColor={colors.accent}
              />
              <DetailRow
                icon="calendar-outline"
                label="Booking date"
                value={formatBookingDate(booking.date)}
                styles={styles}
                accentColor={colors.accent}
              />
              <DetailRow
                icon="time-outline"
                label="Booking time"
                value={`${formatTime12h(booking.startTime)} – ${formatTime12h(booking.endTime)}`}
                styles={styles}
                accentColor={colors.accent}
              />
              <DetailRow
                icon="cash-outline"
                label="Payment"
                value={`${formatInr(booking.priceInr)} · Pay at shop`}
                styles={styles}
                accentColor={colors.accent}
              />

              {canCancel ? (
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    cancelling ? styles.buttonDisabled : null,
                  ]}
                  disabled={cancelling}
                  onPress={openCancelDialog}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel booking"
                >
                  {cancelling ? (
                    <ActivityIndicator color="#F87171" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel request</Text>
                  )}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.replace("/(tabs)")}
                accessibilityRole="button"
                accessibilityLabel="Back to home"
              >
                <Text style={styles.homeButtonText}>Back to home</Text>
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>
      </ScrollView>

      <CancelBookingDialog
        visible={cancelDialogVisible}
        shopName={booking?.shopName}
        busy={cancelling}
        onKeep={() => {
          if (!cancelling) setCancelDialogVisible(false);
        }}
        onConfirmCancel={() => {
          void runCancel();
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },

  loader: {
    marginTop: 32,
    marginBottom: 16,
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
    borderColor: colors.border,
  },

  retryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },

  statusBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundMuted,
    padding: 16,
    marginBottom: 20,
  },

  statusBannerPending: {
    borderColor: "rgba(251,191,36,0.45)",
    backgroundColor: "rgba(251,191,36,0.08)",
  },

  statusBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusLabel: {
    fontSize: 13,
    fontWeight: "700",
  },

  bannerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  bannerBody: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  detailRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(249,115,22,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },

  cancelButton: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#F87171",
    fontWeight: "700",
    fontSize: 15,
  },

  homeButton: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.accent,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  homeButtonText: {
    color: colors.accentText,
    fontWeight: "800",
    fontSize: 15,
  },

  buttonDisabled: {
    opacity: 0.7,
  },
});
}

