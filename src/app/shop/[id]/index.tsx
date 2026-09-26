import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";
import {
  createCustomerBooking,
  getCustomerBookingErrorMessage,
} from "@/services/customer-bookings-api";
import {
  DEFAULT_SHOP_SERVICES,
  fetchShopById,
  formatRatingSummary,
  formatShopAddress,
  getShopsErrorMessage,
  isShopOpenNow,
  staffFirstName,
  type ShopDetail,
} from "@/services/shops-api";

const SHOP_PLACEHOLDER = require("@/assets/images/hero.jpg");
const STEPS = ["Services", "Barber", "Review"] as const;
type StepIndex = 0 | 1 | 2;
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

type ShopService = (typeof DEFAULT_SHOP_SERVICES)[number];

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

function formatDateChip(dateKey: string) {
  const date = parseDateKey(dateKey);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const day = date.getDate();
  return `${weekday} ${day}`;
}

function formatDateLong(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function toMinutes(time24: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function fromMinutes(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildUpcomingDates(count: number, holidays: string[]) {
  const holidaySet = new Set(holidays);
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    const key = toDateKey(cursor);
    if (!holidaySet.has(key)) {
      dates.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function buildTimeSlots(
  shop: Pick<ShopDetail, "openTime" | "closeTime" | "lunchStart" | "lunchEnd">,
  dateKey: string,
  durationMinutes: number,
) {
  const open = toMinutes(shop.openTime);
  const close = toMinutes(shop.closeTime);
  const lunchStart = toMinutes(shop.lunchStart);
  const lunchEnd = toMinutes(shop.lunchEnd);
  if (open === null || close === null || durationMinutes <= 0) return [];

  const slots: string[] = [];
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let start = open; start + durationMinutes <= close; start += SLOT_MINUTES) {
    const end = start + durationMinutes;
    const overlapsLunch =
      lunchStart !== null &&
      lunchEnd !== null &&
      start < lunchEnd &&
      end > lunchStart;

    if (overlapsLunch) continue;
    if (isToday && start < nowMinutes + 15) continue;

    slots.push(fromMinutes(start));
  }

  return slots;
}

export default function ShopBookAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = Array.isArray(id) ? id[0] : id;

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepIndex>(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);

  const loadShop = useCallback(async () => {
    if (!shopId) {
      setError("Shop not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchShopById(shopId);
      setShop(data);
    } catch (err) {
      setShop(null);
      setError(getShopsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      void loadShop();
    }, [loadShop]),
  );

  const isOpen = useMemo(() => (shop ? isShopOpenNow(shop) : false), [shop]);

  const selectedServices = useMemo(
    () =>
      DEFAULT_SHOP_SERVICES.filter((service) =>
        selectedServiceIds.includes(service.id),
      ),
    [selectedServiceIds],
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.priceInr, 0),
    [selectedServices],
  );

  const durationMinutes = Math.max(
    SLOT_MINUTES,
    selectedServices.length * SLOT_MINUTES,
  );

  const availableDates = useMemo(
    () => (shop ? buildUpcomingDates(DAYS_AHEAD, shop.holidays) : []),
    [shop],
  );

  const timeSlots = useMemo(() => {
    if (!shop || !selectedDate) return [];
    return buildTimeSlots(shop, selectedDate, durationMinutes);
  }, [durationMinutes, selectedDate, shop]);

  const selectedStaff = useMemo(
    () => shop?.staff.find((member) => member.id === selectedStaffId) ?? null,
    [selectedStaffId, shop],
  );

  const endTime = useMemo(() => {
    if (!selectedStartTime) return null;
    const start = toMinutes(selectedStartTime);
    if (start === null) return null;
    return fromMinutes(start + durationMinutes);
  }, [durationMinutes, selectedStartTime]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
    // Changing services can change duration — clear slot so user re-picks.
    setSelectedStartTime(null);
  };

  const goNextFromServices = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert("Select services", "Choose at least one service to continue.");
      return;
    }
    setStep(1);
  };

  const goNextFromBarber = () => {
    if (!selectedStaffId) {
      Alert.alert("Select barber", "Choose a barber to continue.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Select date", "Choose an appointment date to continue.");
      return;
    }
    if (!selectedStartTime || !endTime) {
      Alert.alert("Select time", "Choose a time slot to continue.");
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    if (
      !shop ||
      selectedServices.length === 0 ||
      !selectedStaff ||
      !selectedDate ||
      !selectedStartTime ||
      !endTime
    ) {
      Alert.alert("Incomplete booking", "Please complete all steps first.");
      return;
    }

    setConfirming(true);
    try {
      await createCustomerBooking(shop.id, {
        serviceName: selectedServices.map((service) => service.name).join(" + "),
        staffId: selectedStaff.id,
        priceInr: totalAmount,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime,
      });

      Alert.alert(
        "Request sent",
        "Your booking is waiting for approval. The shop will confirm or reject it soon.",
        [
          {
            text: "View history",
            onPress: () => router.replace("/history"),
          },
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      Alert.alert("Booking failed", getCustomerBookingErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#0B5A47" size="large" />
      </View>
    );
  }

  if (error || !shop) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error ?? "Shop not found."}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void loadShop()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const address = formatShopAddress(shop);
  const ratingLabel = formatRatingSummary(shop.ratingAverage, shop.reviewCount);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Book Appointment</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <Image source={SHOP_PLACEHOLDER} style={styles.heroImage} />

        <View style={styles.nameRow}>
          <Text style={styles.shopName} numberOfLines={2}>
            {shop.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              isOpen ? styles.statusOpen : styles.statusClosed,
            ]}
          >
            <Text style={styles.statusText}>{isOpen ? "Open" : "Closed"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.ratingRow}
          onPress={() =>
            router.push({
              pathname: "/shop/[id]/reviews",
              params: { id: shop.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Read reviews"
        >
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.ratingText}>{ratingLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#0B5A47" />
          <Text style={styles.infoText}>{address}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color="#0B5A47" />
          <Text style={styles.infoText}>
            {shop.phone?.trim() || "Phone not available"}
          </Text>
        </View>

        <View style={styles.stepper}>
          {STEPS.map((label, index) => {
            const active = step === index;
            const done = step > index;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    active || done ? styles.stepDotActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepDotText,
                      active || done ? styles.stepDotTextActive : null,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[styles.stepLabel, active ? styles.stepLabelActive : null]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {step === 0 ? (
          <>
            <Text style={styles.sectionTitle}>Services</Text>
            <Text style={styles.sectionHint}>
              Select one or more services for this visit.
            </Text>
            <View style={styles.optionList}>
              {DEFAULT_SHOP_SERVICES.map((service: ShopService) => {
                const selected = selectedServiceIds.includes(service.id);
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.optionCard,
                      selected ? styles.optionSelected : null,
                    ]}
                    onPress={() => toggleService(service.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionTitle}>{service.name}</Text>
                      <Text style={styles.optionMeta}>₹{service.priceInr}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        selected ? styles.checkboxSelected : null,
                      ]}
                    >
                      {selected ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>Select barber</Text>
            {shop.staff.length === 0 ? (
              <Text style={styles.emptyStaff}>
                No barbers available right now.
              </Text>
            ) : (
              <View style={styles.barberRow}>
                {shop.staff.map((member) => {
                  const selected = selectedStaffId === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.barberChip,
                        selected ? styles.barberChipSelected : null,
                      ]}
                      onPress={() => setSelectedStaffId(member.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <View
                        style={[
                          styles.barberAvatar,
                          selected ? styles.barberAvatarSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.barberInitial,
                            selected ? styles.barberInitialSelected : null,
                          ]}
                        >
                          {staffFirstName(member.name).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.barberName,
                          selected ? styles.barberNameSelected : null,
                        ]}
                        numberOfLines={1}
                      >
                        {staffFirstName(member.name)}
                      </Text>
                      <Text style={styles.barberTitle} numberOfLines={1}>
                        {member.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Appointment date</Text>
            <Text style={styles.sectionHint}>
              Choose a day in the next two weeks (shop holidays are skipped).
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {availableDates.map((dateKey) => {
                const selected = selectedDate === dateKey;
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[styles.dateChip, selected ? styles.chipSelected : null]}
                    onPress={() => {
                      setSelectedDate(dateKey);
                      setSelectedStartTime(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        selected ? styles.chipTextSelected : null,
                      ]}
                    >
                      {formatDateChip(dateKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Time slot</Text>
            <Text style={styles.sectionHint}>
              Based on shop hours. Duration grows with the services you picked.
            </Text>
            {!selectedDate ? (
              <Text style={styles.emptyStaff}>Pick a date to see slots.</Text>
            ) : timeSlots.length === 0 ? (
              <Text style={styles.emptyStaff}>
                No slots left for this date. Try another day.
              </Text>
            ) : (
              <View style={styles.slotGrid}>
                {timeSlots.map((slot) => {
                  const selected = selectedStartTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotChip,
                        selected ? styles.chipSelected : null,
                      ]}
                      onPress={() => setSelectedStartTime(slot)}
                    >
                      <Text
                        style={[
                          styles.slotChipText,
                          selected ? styles.chipTextSelected : null,
                        ]}
                      >
                        {formatTime12h(slot)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.sectionTitle}>Review</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Services</Text>
              {selectedServices.map((service) => (
                <View key={service.id} style={styles.reviewLine}>
                  <Text style={styles.reviewValue}>{service.name}</Text>
                  <Text style={styles.reviewValue}>₹{service.priceInr}</Text>
                </View>
              ))}

              <View style={styles.reviewDivider} />

              <Text style={styles.reviewLabel}>Barber</Text>
              <Text style={styles.reviewValue}>
                {selectedStaff
                  ? staffFirstName(selectedStaff.name)
                  : "Not selected"}
              </Text>

              <Text style={[styles.reviewLabel, styles.reviewSpacer]}>Date</Text>
              <Text style={styles.reviewValue}>
                {selectedDate ? formatDateLong(selectedDate) : "Not selected"}
              </Text>

              <Text style={[styles.reviewLabel, styles.reviewSpacer]}>
                Time slot
              </Text>
              <Text style={styles.reviewValue}>
                {selectedStartTime && endTime
                  ? `${formatTime12h(selectedStartTime)} – ${formatTime12h(endTime)}`
                  : "Not selected"}
              </Text>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewLine}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ₹{totalAmount.toLocaleString("en-IN")}
                </Text>
              </View>

              {user?.name ? (
                <Text style={styles.bookedAs}>Booking as {user.name}</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        {step === 0 ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goNextFromServices}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : null}

        {step === 1 ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(0)}
            >
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.footerPrimary]}
              onPress={goNextFromBarber}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(1)}
            >
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.footerPrimary,
                confirming ? styles.buttonDisabled : null,
              ]}
              disabled={confirming}
              onPress={() => void handleConfirm()}
            >
              {confirming ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  centered: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 8,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPlaceholder: {
    width: 40,
  },

  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  heroImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },

  shopName: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
  },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusOpen: {
    backgroundColor: "#16A34A",
  },

  statusClosed: {
    backgroundColor: "#DC2626",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  ratingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
  },

  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },

  stepper: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },

  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepDotActive: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },

  stepDotText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  stepDotTextActive: {
    color: "#FFFFFF",
  },

  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  stepLabelActive: {
    color: "#0B5A47",
  },

  sectionTitle: {
    marginTop: 26,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  sectionHint: {
    marginBottom: 12,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  optionList: {
    gap: 10,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  optionSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDF4",
  },

  optionCopy: {
    flex: 1,
    gap: 2,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  optionMeta: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#0B5A47",
  },

  emptyStaff: {
    color: "#64748B",
    fontSize: 14,
  },

  barberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  barberChip: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },

  barberChipSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDF4",
  },

  barberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  barberAvatarSelected: {
    backgroundColor: "#0B5A47",
  },

  barberInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  barberInitialSelected: {
    color: "#FFFFFF",
  },

  barberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  barberNameSelected: {
    color: "#0B5A47",
  },

  barberTitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },

  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },

  dateChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  slotChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: "30%",
    alignItems: "center",
  },

  chipSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#0B5A47",
  },

  dateChipText: {
    fontWeight: "700",
    color: "#334155",
  },

  slotChipText: {
    fontWeight: "600",
    color: "#334155",
    fontSize: 13,
  },

  chipTextSelected: {
    color: "#FFFFFF",
  },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  reviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  reviewSpacer: {
    marginTop: 14,
  },

  reviewValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },

  reviewLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },

  reviewDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B5A47",
  },

  bookedAs: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  footerRow: {
    flexDirection: "row",
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  footerPrimary: {
    flex: 1,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 15,
  },

  errorText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: "#0B5A47",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  backLink: {
    color: "#0B5A47",
    fontWeight: "600",
  },
});
