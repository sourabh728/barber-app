import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookingSuccessDialog } from "@/components/booking-success-dialog";
import { useSession } from "@/context/session-provider";
import {
  createCustomerBooking,
  getCustomerBookingErrorMessage,
} from "@/services/customer-bookings-api";
import { showAppAlert } from "@/utils/app-alert";
import {
  DEFAULT_SHOP_SERVICES,
  fetchShopAvailability,
  fetchShopById,
  formatRatingSummary,
  type OccupiedSlotInterval,
  formatShopAddress,
  getShopsErrorMessage,
  isShopOpenNow,
  staffFirstName,
  type ShopDetail,
  type ShopServiceOption,
} from "@/services/shops-api";
import { shopImageSource } from "@/utils/media";

const STEPS = ["Services", "Barber", "Review"] as const;
type StepIndex = 0 | 1 | 2;
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;
/** Sentinel for "Any available" barber preference. */
const ANY_STAFF_ID = "any";

type BookableService = ShopServiceOption;

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

function slotOverlapsOccupied(
  slotStart: string,
  durationMinutes: number,
  occupied: OccupiedSlotInterval[],
  activeStaffCount = 1,
) {
  const start = toMinutes(slotStart);
  if (start === null) return false;
  const slotEnd = fromMinutes(start + durationMinutes);
  const overlapping = occupied.filter(
    (other) => slotStart < other.endTime && other.startTime < slotEnd,
  ).length;
  return overlapping >= Math.max(1, activeStaffCount);
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
  const [successVisible, setSuccessVisible] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlotInterval[]>(
    [],
  );
  const [activeStaffCount, setActiveStaffCount] = useState(1);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityNonce, setAvailabilityNonce] = useState(0);

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
      setAvailabilityNonce((n) => n + 1);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId || !selectedStaffId || !selectedDate) {
      setOccupiedSlots([]);
      setActiveStaffCount(1);
      return;
    }

    let cancelled = false;
    setLoadingAvailability(true);
    void fetchShopAvailability(shopId, {
      staffId: selectedStaffId === ANY_STAFF_ID ? null : selectedStaffId,
      date: selectedDate,
    })
      .then((data) => {
        if (!cancelled) {
          setOccupiedSlots(data.occupied);
          setActiveStaffCount(Math.max(1, data.activeStaffCount ?? 1));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOccupiedSlots([]);
          setActiveStaffCount(1);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availabilityNonce, selectedDate, selectedStaffId, shopId]);

  useFocusEffect(
    useCallback(() => {
      void loadShop();
    }, [loadShop]),
  );

  const isOpen = useMemo(() => (shop ? isShopOpenNow(shop) : false), [shop]);

  const bookableServices = useMemo<BookableService[]>(() => {
    if (!shop) return [];
    if (shop.services?.length) {
      return shop.services;
    }
    return DEFAULT_SHOP_SERVICES.map((service) => ({
      id: service.id,
      name: service.name,
      priceInr: service.priceInr,
      durationMin: service.durationMin,
    }));
  }, [shop]);

  const selectedServices = useMemo(
    () =>
      bookableServices.filter((service) =>
        selectedServiceIds.includes(service.id),
      ),
    [bookableServices, selectedServiceIds],
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.priceInr, 0),
    [selectedServices],
  );

  const durationMinutes = Math.max(
    SLOT_MINUTES,
    selectedServices.reduce(
      (sum, service) => sum + (service.durationMin || SLOT_MINUTES),
      0,
    ) || SLOT_MINUTES,
  );

  useEffect(() => {
    if (
      !selectedStartTime ||
      !slotOverlapsOccupied(
        selectedStartTime,
        durationMinutes,
        occupiedSlots,
        activeStaffCount,
      )
    ) {
      return;
    }
    setSelectedStartTime(null);
  }, [activeStaffCount, durationMinutes, occupiedSlots, selectedStartTime]);

  const availableDates = useMemo(
    () => (shop ? buildUpcomingDates(DAYS_AHEAD, shop.holidays) : []),
    [shop],
  );

  // Default to today's first bookable date + Any available so slots show immediately.
  useEffect(() => {
    if (!shop || availableDates.length === 0) return;
    setSelectedDate((current) => current ?? availableDates[0] ?? null);
    setSelectedStaffId((current) => current ?? ANY_STAFF_ID);
  }, [availableDates, shop]);

  const timeSlots = useMemo(() => {
    if (!shop || !selectedDate) return [];
    return buildTimeSlots(shop, selectedDate, durationMinutes);
  }, [durationMinutes, selectedDate, shop]);

  const prefersAnyStaff = selectedStaffId === ANY_STAFF_ID;

  const selectedStaff = useMemo(
    () =>
      prefersAnyStaff
        ? null
        : (shop?.staff.find((member) => member.id === selectedStaffId) ?? null),
    [prefersAnyStaff, selectedStaffId, shop],
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
      showAppAlert("Select services", "Choose at least one service to continue.");
      return;
    }
    setStep(1);
  };

  const goNextFromBarber = () => {
    if (!selectedStaffId) {
      showAppAlert(
        "Select barber",
        "Choose a barber, or Any available, to continue.",
      );
      return;
    }
    if (!selectedDate) {
      showAppAlert("Select date", "Choose an appointment date to continue.");
      return;
    }
    if (!selectedStartTime || !endTime) {
      showAppAlert("Select time", "Choose a time slot to continue.");
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    if (
      !shop ||
      selectedServices.length === 0 ||
      !selectedStaffId ||
      !selectedDate ||
      !selectedStartTime ||
      !endTime
    ) {
      showAppAlert("Incomplete booking", "Please complete all steps first.");
      return;
    }

    setConfirming(true);
    try {
      await createCustomerBooking(shop.id, {
        serviceName: selectedServices.map((service) => service.name).join(" + "),
        staffId: prefersAnyStaff ? null : selectedStaffId,
        priceInr: totalAmount,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime,
      });

      setSuccessVisible(true);
    } catch (err) {
      showAppAlert("Booking failed", getCustomerBookingErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const closeSuccessAndGoBack = () => {
    setSuccessVisible(false);
    router.back();
  };

  const closeSuccessAndViewHistory = () => {
    setSuccessVisible(false);
    router.replace("/history");
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
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={18} color="#0F172A" />
          </TouchableOpacity>

          <Image
            source={shopImageSource(shop.photoUrl)}
            style={styles.headerThumb}
          />

          <View style={styles.headerCopy}>
            <Text style={styles.headerShopName} numberOfLines={1}>
              {shop.name}
            </Text>
            <Text style={styles.headerSubtitle}>Book Appointment</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isOpen ? styles.statusOpen : styles.statusClosed,
            ]}
          >
            <Text style={styles.statusText}>{isOpen ? "Open" : "Closed"}</Text>
          </View>
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
                  style={[
                    styles.stepLabel,
                    active ? styles.stepLabelActive : null,
                  ]}
                >
                  {label}
                </Text>
                {index < STEPS.length - 1 ? (
                  <View
                    style={[
                      styles.stepConnector,
                      done ? styles.stepConnectorDone : null,
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {step === 0 ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Services</Text>
            <Text style={styles.sectionHint}>
              {shop.services?.length
                ? "Select one or more services for this visit."
                : "This shop has not set a custom menu yet — showing defaults."}
            </Text>
            {bookableServices.length === 0 ? (
              <Text style={styles.emptyStaff}>
                No services available for this shop.
              </Text>
            ) : (
              <View style={styles.optionList}>
                {bookableServices.map((service: BookableService) => {
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
                        <Text style={styles.optionMeta}>
                          ₹{service.priceInr}
                          {service.durationMin
                            ? ` · ${service.durationMin} min`
                            : ""}
                        </Text>
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
            )}
            <TouchableOpacity
              style={styles.metaLink}
              onPress={() =>
                router.push({
                  pathname: "/shop/[id]/reviews",
                  params: { id: shop.id },
                })
              }
            >
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.metaLinkText}>{ratingLabel}</Text>
              <Text style={styles.metaLinkMuted} numberOfLines={1}>
                {address}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 1 ? (
          <>
            {shop.staff.length === 0 ? (
              <Text style={styles.emptyStaff}>
                No barbers available right now.
              </Text>
            ) : (
              <>
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
                        onPress={() => {
                          setSelectedStaffId(member.id);
                          setSelectedStartTime(null);
                        }}
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
                            {staffFirstName(member.name)
                              .charAt(0)
                              .toUpperCase()}
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
                        {member.status === "AWAY" && member.awayUntil ? (
                          <Text style={styles.barberAwayHint} numberOfLines={1}>
                            Back{" "}
                            {member.awayUntil.slice(11, 16) ||
                              member.awayUntil.replace("T", " ")}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.anyStaffButton,
                    prefersAnyStaff ? styles.anyStaffButtonSelected : null,
                  ]}
                  onPress={() => {
                    setSelectedStaffId(ANY_STAFF_ID);
                    setSelectedStartTime(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: prefersAnyStaff }}
                >
                  <Text
                    style={[
                      styles.anyStaffText,
                      prefersAnyStaff ? styles.anyStaffTextSelected : null,
                    ]}
                  >
                    Any available
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.schedulePanel}>
              <Text style={styles.sectionTitle}>Appointment date</Text>
              <Text style={styles.sectionHint}>
                Next two weeks – shop holidays are skipped.
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
                      style={[
                        styles.dateChip,
                        selected ? styles.selectionGlow : null,
                      ]}
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

              <Text style={[styles.sectionTitle, styles.slotTitle]}>
                Time slot
              </Text>
              {loadingAvailability ? (
                <ActivityIndicator
                  color="#0B5A47"
                  style={styles.availabilityLoader}
                />
              ) : timeSlots.length === 0 ? (
                <Text style={styles.emptyStaff}>
                  No slots left for this date. Try another day.
                </Text>
              ) : (
                <View style={styles.slotGrid}>
                  {timeSlots.map((slot) => {
                    const booked = slotOverlapsOccupied(
                      slot,
                      durationMinutes,
                      occupiedSlots,
                      activeStaffCount,
                    );
                    const selected = !booked && selectedStartTime === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotChip,
                          booked ? styles.slotChipBooked : null,
                          selected ? styles.selectionGlow : null,
                        ]}
                        disabled={booked}
                        onPress={() => setSelectedStartTime(slot)}
                        accessibilityState={{ disabled: booked, selected }}
                      >
                        <Text
                          style={[
                            styles.slotChipText,
                            booked ? styles.slotChipTextBooked : null,
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
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <View style={styles.panel}>
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
                {prefersAnyStaff
                  ? "Any available"
                  : selectedStaff
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
          </View>
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

      <BookingSuccessDialog
        visible={successVisible}
        shopName={shop.name}
        onViewHistory={closeSuccessAndViewHistory}
        onOk={closeSuccessAndGoBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF6F1",
  },
  centered: {
    flex: 1,
    backgroundColor: "#EAF6F1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1E7DD",
    alignItems: "center",
    justifyContent: "center",
  },
  headerThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#D1E7DD",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerShopName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusOpen: {
    backgroundColor: "#0B5A47",
  },
  statusClosed: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stepper: {
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#B7D7C9",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  stepDotTextActive: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepLabelActive: {
    color: "#0B5A47",
  },
  stepConnector: {
    position: "absolute",
    top: 13,
    left: "58%",
    width: "84%",
    height: 2,
    backgroundColor: "#C5DDD3",
  },
  stepConnectorDone: {
    backgroundColor: "#0B5A47",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7EBE3",
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 6,
  },
  schedulePanel: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D7EBE3",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  slotTitle: {
    marginTop: 16,
  },
  sectionHint: {
    marginBottom: 10,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F4FAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7EBE3",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#E8F7F0",
  },
  optionCopy: { flex: 1, gap: 2 },
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
  metaLink: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  metaLinkMuted: {
    flex: 1,
    fontSize: 11,
    color: "#94A3B8",
  },
  emptyStaff: {
    color: "#64748B",
    fontSize: 14,
    marginBottom: 8,
  },
  barberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  barberChip: {
    width: "47%",
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#C9DED4",
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  barberChipSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDF7",
  },
  barberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E7F3ED",
    alignItems: "center",
    justifyContent: "center",
  },
  barberAvatarSelected: {
    backgroundColor: "#0B5A47",
  },
  barberInitial: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B5A47",
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
  barberAwayHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  anyStaffButton: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#C9DED4",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    alignItems: "center",
  },
  anyStaffButtonSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#0B5A47",
  },
  anyStaffText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  anyStaffTextSelected: {
    color: "#FFFFFF",
  },
  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  dateChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1F2937",
    backgroundColor: "#F4FAF7",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1F2937",
    backgroundColor: "#F4FAF7",
    paddingHorizontal: 8,
    paddingVertical: 11,
    width: "31.5%",
    alignItems: "center",
  },
  slotChipBooked: {
    borderColor: "#CBD5E1",
    backgroundColor: "#E2E8F0",
    opacity: 0.7,
  },
  slotChipTextBooked: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  availabilityLoader: {
    marginVertical: 12,
  },
  selectionGlow: {
    backgroundColor: "#0B5A47",
    borderColor: "#2DD4BF",
    borderWidth: 2,
    shadowColor: "#2DD4BF",
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dateChipText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 13,
  },
  slotChipText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 12,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  reviewCard: {
    backgroundColor: "#F4FAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7EBE3",
    padding: 14,
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
    backgroundColor: "#D7EBE3",
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
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#EAF6F1",
    borderTopWidth: 1,
    borderTopColor: "#D7EBE3",
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

