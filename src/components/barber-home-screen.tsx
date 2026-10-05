import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";
import {
  fetchMyShopSchedule,
  getScheduleErrorMessage,
  type ShopSchedule,
} from "@/services/shop-schedule-api";
import {
  fetchMyShopAppointments,
  getAppointmentErrorMessage,
  updateMyShopAppointment,
  type AppointmentStatus,
  type ShopAppointment,
} from "@/services/shop-appointments-api";
import { showAppAlert } from "@/utils/app-alert";

const SLOT_BLOCK_MINUTES = 45;
const SLOT_STEP_MINUTES = 30;

type SlotBlock =
  | {
      kind: "lunch";
      startTime: string;
      endTime: string;
    }
  | {
      kind: "slot";
      startTime: string;
      endTime: string;
      status: "available" | "booked" | "pending" | "walkin";
      appointment: ShopAppointment | null;
    };

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

function toMinutes(time24: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function fromMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTime12h(time24: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time24);
  if (!match) return time24;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "pm" : "am";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

function formatTodayHeading(dateKey: string) {
  const date = parseDateKey(dateKey);
  const monthDay = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  return `Today: ${monthDay}`;
}

function customerShortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
  return `${parts[0]} ${lastInitial}.`;
}

function barberFirstName(name: string | undefined | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "Barber";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA < endB && startB < endA;
}

function isActiveAppointment(appointment: ShopAppointment) {
  return (
    appointment.status !== "CANCELLED" && appointment.status !== "REJECTED"
  );
}

function appointmentDurationMinutes(appointment: ShopAppointment) {
  const start = toMinutes(appointment.startTime);
  const end = toMinutes(appointment.endTime);
  if (start === null || end === null || end <= start) {
    return SLOT_STEP_MINUTES;
  }
  return Math.max(SLOT_STEP_MINUTES, end - start);
}

function findOverlappingAppointment(
  appointments: ShopAppointment[],
  startTime: string,
  endTime: string,
  excludeId?: string,
  staffId?: string | null,
) {
  return (
    appointments.find(
      (item) =>
        item.id !== excludeId &&
        isActiveAppointment(item) &&
        (staffId == null || item.staffId === staffId) &&
        intervalsOverlap(startTime, endTime, item.startTime, item.endTime),
    ) ?? null
  );
}

function buildDaySlotBlocks(
  schedule: ShopSchedule,
  dateKey: string,
  appointments: ShopAppointment[],
): SlotBlock[] {
  const open = toMinutes(schedule.openTime);
  const close = toMinutes(schedule.closeTime);
  const lunchStart = toMinutes(schedule.lunchStart);
  const lunchEnd = toMinutes(schedule.lunchEnd);
  if (open === null || close === null) return [];

  const blocks: SlotBlock[] = [];
  let lunchInserted = false;
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (
    let start = open;
    start + SLOT_BLOCK_MINUTES <= close;
    start += SLOT_BLOCK_MINUTES
  ) {
    const end = start + SLOT_BLOCK_MINUTES;
    const startTime = fromMinutes(start);
    const endTime = fromMinutes(end);

    if (
      !lunchInserted &&
      lunchStart !== null &&
      lunchEnd !== null &&
      start >= lunchStart
    ) {
      blocks.push({
        kind: "lunch",
        startTime: schedule.lunchStart,
        endTime: schedule.lunchEnd,
      });
      lunchInserted = true;
    }

    if (
      lunchStart !== null &&
      lunchEnd !== null &&
      start < lunchEnd &&
      end > lunchStart
    ) {
      continue;
    }

    if (isToday && end <= nowMinutes) {
      continue;
    }

    const appointment = findOverlappingAppointment(
      appointments,
      startTime,
      endTime,
    );

    let status: "available" | "booked" | "pending" | "walkin" = "available";
    if (appointment) {
      if (appointment.status === "PENDING") {
        status = "pending";
      } else if (appointment.isWalkIn) {
        status = "walkin";
      } else {
        status = "booked";
      }
    }

    blocks.push({
      kind: "slot",
      startTime,
      endTime,
      status,
      appointment,
    });
  }

  if (
    !lunchInserted &&
    lunchStart !== null &&
    lunchEnd !== null &&
    lunchEnd > open &&
    lunchStart < close
  ) {
    blocks.push({
      kind: "lunch",
      startTime: schedule.lunchStart,
      endTime: schedule.lunchEnd,
    });
  }

  return blocks;
}

function buildAvailableRescheduleSlots(
  schedule: ShopSchedule,
  dateKey: string,
  durationMinutes: number,
  appointments: ShopAppointment[],
  excludeAppointmentId: string,
  staffId: string | null,
) {
  const open = toMinutes(schedule.openTime);
  const close = toMinutes(schedule.closeTime);
  const lunchStart = toMinutes(schedule.lunchStart);
  const lunchEnd = toMinutes(schedule.lunchEnd);
  if (open === null || close === null || durationMinutes <= 0) return [];

  const slots: string[] = [];
  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (
    let start = open;
    start + durationMinutes <= close;
    start += SLOT_STEP_MINUTES
  ) {
    const end = start + durationMinutes;
    const startTime = fromMinutes(start);
    const endTime = fromMinutes(end);

    const overlapsLunch =
      lunchStart !== null &&
      lunchEnd !== null &&
      start < lunchEnd &&
      end > lunchStart;
    if (overlapsLunch) continue;
    if (isToday && start < nowMinutes + 15) continue;

    const clash = findOverlappingAppointment(
      appointments,
      startTime,
      endTime,
      excludeAppointmentId,
      staffId,
    );
    if (clash) continue;

    slots.push(startTime);
  }

  return slots;
}

export function BarberHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [schedule, setSchedule] = useState<ShopSchedule | null>(null);
  const [appointments, setAppointments] = useState<ShopAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [suggestTarget, setSuggestTarget] = useState<ShopAppointment | null>(
    null,
  );
  const [suggestSlots, setSuggestSlots] = useState<string[]>([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [scheduleData, upcoming] = await Promise.all([
        fetchMyShopSchedule(),
        fetchMyShopAppointments({ date: todayKey, tab: "upcoming" }),
      ]);
      setSchedule(scheduleData);
      setAppointments(upcoming);
    } catch (err) {
      setError(
        getScheduleErrorMessage(err) || getAppointmentErrorMessage(err),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const pendingRequests = useMemo(
    () =>
      appointments
        .filter((item) => item.status === "PENDING")
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments],
  );

  const slotBlocks = useMemo(() => {
    if (!schedule) return [];
    return buildDaySlotBlocks(schedule, todayKey, appointments);
  }, [appointments, schedule, todayKey]);

  const patchStatus = async (
    appointment: ShopAppointment,
    status: AppointmentStatus,
  ) => {
    setActionId(appointment.id);
    setError(null);
    try {
      await updateMyShopAppointment(appointment.id, { status });
      await loadDashboard(true);
    } catch (err) {
      showAppAlert("Could not update", getAppointmentErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const confirmDecline = (appointment: ShopAppointment) => {
    showAppAlert(
      "Decline request",
      `Decline ${appointment.customerName}'s booking request?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            void patchStatus(appointment, "REJECTED");
          },
        },
      ],
    );
  };

  const openSuggestModal = (appointment: ShopAppointment) => {
    if (!schedule) {
      showAppAlert("Schedule unavailable", "Set your shop hours first.");
      return;
    }

    const duration = appointmentDurationMinutes(appointment);
    const slots = buildAvailableRescheduleSlots(
      schedule,
      appointment.date,
      duration,
      appointments,
      appointment.id,
      appointment.staffId,
    );

    if (slots.length === 0) {
      showAppAlert(
        "No open slots",
        "There are no other available times for this barber today. Try declining or ask the customer to pick another day.",
      );
      return;
    }

    setSuggestTarget(appointment);
    setSuggestSlots(slots);
  };

  const applySuggestedSlot = async (startTime: string) => {
    if (!suggestTarget) return;
    const duration = appointmentDurationMinutes(suggestTarget);
    const start = toMinutes(startTime);
    if (start === null) return;
    const endTime = fromMinutes(start + duration);

    setActionId(suggestTarget.id);
    try {
      await updateMyShopAppointment(suggestTarget.id, {
        startTime,
        endTime,
      });
      setSuggestTarget(null);
      setSuggestSlots([]);
      showAppAlert(
        "Time suggested",
        `The customer was notified about ${formatTime12h(startTime)}–${formatTime12h(endTime)}.`,
      );
      await loadDashboard(true);
    } catch (err) {
      showAppAlert("Could not suggest time", getAppointmentErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const renderSlotBlock = (block: SlotBlock, index: number) => {
    if (block.kind === "lunch") {
      return (
        <View key={`lunch-${index}`} style={styles.lunchBlock}>
          <Text style={styles.lunchText}>
            {formatTime12h(block.startTime)} – {formatTime12h(block.endTime)}{" "}
            LUNCH TIME
          </Text>
        </View>
      );
    }

    const labelTime = `${formatTime12h(block.startTime)} – ${formatTime12h(block.endTime)}`;
    let subtitle = "Available";
    let slotStyle = styles.slotAvailable;
    let textStyle = styles.slotTextAvailable;

    if (block.status === "booked" && block.appointment) {
      subtitle = `Booked – ${customerShortName(block.appointment.customerName)}`;
      slotStyle = styles.slotBooked;
      textStyle = styles.slotTextBooked;
    } else if (block.status === "pending" && block.appointment) {
      subtitle = `Request – ${customerShortName(block.appointment.customerName)}`;
      slotStyle = styles.slotPending;
      textStyle = styles.slotTextPending;
    } else if (block.status === "walkin" && block.appointment) {
      subtitle = `Book Slot (${barberFirstName(user?.name)})`;
      slotStyle = styles.slotWalkIn;
      textStyle = styles.slotTextWalkIn;
    }

    return (
      <View key={`${block.startTime}-${index}`} style={[styles.slotBlock, slotStyle]}>
        <Text style={[styles.slotTime, textStyle]}>{labelTime}</Text>
        <Text style={[styles.slotSubtitle, textStyle]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    );
  };

  if (loading && !schedule) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#0B5A47" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadDashboard(true)}
            tintColor="#0B5A47"
          />
        }
      >
        <Text style={styles.welcome}>
          Welcome, {barberFirstName(user?.name)}
        </Text>
        <Text style={styles.pageTitle}>Home</Text>
        <View style={styles.titleRule} />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadDashboard()}>
              <Text style={styles.errorRetry}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.incomingCard}>
          <View style={styles.incomingHeader}>
            <Text style={styles.incomingHeaderText}>Incoming Requests</Text>
          </View>

          {pendingRequests.length === 0 ? (
            <Text style={styles.incomingEmpty}>No pending requests today.</Text>
          ) : (
            pendingRequests.map((appointment) => {
              const busy = actionId === appointment.id;
              return (
                <View key={appointment.id} style={styles.requestRow}>
                  <View style={styles.requestIdentity}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={22} color="#64748B" />
                    </View>
                    <View style={styles.requestCopy}>
                      <Text style={styles.requestName}>
                        {customerShortName(appointment.customerName)}
                      </Text>
                      <Text style={styles.requestTime}>
                        {formatTime12h(appointment.startTime)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.acceptButton, busy && styles.buttonDisabled]}
                      disabled={busy}
                      onPress={() => void patchStatus(appointment, "CONFIRMED")}
                    >
                      {busy ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.acceptText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineButton, busy && styles.buttonDisabled]}
                      disabled={busy}
                      onPress={() => confirmDecline(appointment)}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.suggestButton, busy && styles.buttonDisabled]}
                      disabled={busy}
                      onPress={() => openSuggestModal(appointment)}
                    >
                      <Text style={styles.suggestText}>Suggest Next Slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.slotSectionHeader}>
          <Text style={styles.slotDate}>{formatTodayHeading(todayKey)}</Text>
          <Text style={styles.slotStatusLabel}>Slot Status</Text>
        </View>

        {!schedule ? (
          <Text style={styles.incomingEmpty}>
            Complete shop setup to see today&apos;s schedule.
          </Text>
        ) : slotBlocks.length === 0 ? (
          <Text style={styles.incomingEmpty}>
            No slots to show for today. Check your shop hours.
          </Text>
        ) : (
          <View style={styles.slotGrid}>
            {slotBlocks.map((block, index) => {
              if (block.kind === "lunch") {
                return (
                  <View key={`lunch-${index}`} style={styles.lunchWrap}>
                    {renderSlotBlock(block, index)}
                  </View>
                );
              }
              return renderSlotBlock(block, index);
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.manageLink}
          onPress={() => router.push("/barber/appointments")}
        >
          <Text style={styles.manageLinkText}>Open full appointments</Text>
          <Ionicons name="chevron-forward" size={18} color="#0B5A47" />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={Boolean(suggestTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSuggestTarget(null);
          setSuggestSlots([]);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setSuggestTarget(null);
            setSuggestSlots([]);
          }}
        >
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Suggest next slot</Text>
            <Text style={styles.modalHint}>
              Pick an open time for{" "}
              {suggestTarget
                ? customerShortName(suggestTarget.customerName)
                : "this customer"}
              . They will get a notification.
            </Text>
            <ScrollView contentContainerStyle={styles.suggestList}>
              {suggestSlots.map((slot) => {
                const duration = suggestTarget
                  ? appointmentDurationMinutes(suggestTarget)
                  : SLOT_STEP_MINUTES;
                const start = toMinutes(slot);
                const endTime =
                  start !== null ? fromMinutes(start + duration) : slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={styles.suggestOption}
                    onPress={() => void applySuggestedSlot(slot)}
                  >
                    <Text style={styles.suggestOptionText}>
                      {formatTime12h(slot)} – {formatTime12h(endTime)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  welcome: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },

  titleRule: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginTop: 10,
    marginBottom: 18,
  },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 14,
  },

  errorRetry: {
    color: "#0B5A47",
    fontWeight: "700",
  },

  incomingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 22,
  },

  incomingHeader: {
    backgroundColor: "#0B5A47",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  incomingHeaderText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  incomingEmpty: {
    padding: 16,
    color: "#64748B",
    fontSize: 14,
  },

  requestRow: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },

  requestIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  requestCopy: {
    flex: 1,
  },

  requestName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  requestTime: {
    marginTop: 2,
    color: "#64748B",
    fontWeight: "600",
  },

  requestActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  acceptButton: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },

  acceptText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  declineButton: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: "center",
  },

  declineText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  suggestButton: {
    backgroundColor: "#0891B2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexGrow: 1,
    alignItems: "center",
  },

  suggestText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  slotSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },

  slotDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  slotStatusLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  lunchWrap: {
    width: "100%",
  },

  lunchBlock: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#38BDF8",
    backgroundColor: "#E0F2FE",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },

  lunchText: {
    color: "#0369A1",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },

  slotBlock: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    minHeight: 72,
    justifyContent: "center",
  },

  slotAvailable: {
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  slotBooked: {
    backgroundColor: "#0B5A47",
  },

  slotPending: {
    backgroundColor: "#991B1B",
  },

  slotWalkIn: {
    backgroundColor: "#7F1D1D",
  },

  slotTime: {
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 4,
  },

  slotSubtitle: {
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 15,
  },

  slotTextAvailable: {
    color: "#475569",
  },

  slotTextBooked: {
    color: "#FFFFFF",
  },

  slotTextPending: {
    color: "#FFFFFF",
  },

  slotTextWalkIn: {
    color: "#FFFFFF",
  },

  manageLink: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  manageLinkText: {
    color: "#0B5A47",
    fontWeight: "700",
    fontSize: 15,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },

  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "70%",
  },

  modalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalHint: {
    marginTop: 6,
    marginBottom: 12,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },

  suggestList: {
    gap: 8,
    paddingBottom: 8,
  },

  suggestOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  suggestOptionText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 15,
  },
});
