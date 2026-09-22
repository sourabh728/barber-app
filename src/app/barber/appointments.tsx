import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMyShopAppointment,
  fetchMyShopAppointments,
  getAppointmentErrorMessage,
  updateMyShopAppointment,
  type AppointmentStatus,
  type AppointmentTab,
  type ShopAppointment,
} from "@/services/shop-appointments-api";
import {
  fetchMyShopStaff,
  type ShopStaff,
} from "@/services/shop-staff-api";

type AppointmentFormState = {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffId: string;
  priceInr: string;
  startTime: string;
  endTime: string;
  isWalkIn: boolean;
};

const emptyForm: AppointmentFormState = {
  customerName: "",
  customerPhone: "",
  serviceName: "",
  staffId: "",
  priceInr: "",
  startTime: "10:00",
  endTime: "10:30",
  isWalkIn: true,
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TABS: { key: AppointmentTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

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

function addDays(dateKey: string, delta: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

function formatDateLabel(dateKey: string) {
  const todayKey = toDateKey(new Date());
  const date = parseDateKey(dateKey);
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (dateKey === todayKey) {
    return `Today, ${formatted}`;
  }
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday}, ${formatted}`;
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

export default function BarberAppointmentsScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [activeTab, setActiveTab] = useState<AppointmentTab>("upcoming");
  const [appointments, setAppointments] = useState<ShopAppointment[]>([]);
  const [staff, setStaff] = useState<ShopStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<AppointmentFormState>(emptyForm);

  const setField = useCallback(
    <K extends keyof AppointmentFormState>(
      key: K,
      value: AppointmentFormState[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFormError("");
    },
    [],
  );

  const loadAppointments = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const list = await fetchMyShopAppointments({
        date: selectedDate,
        tab: activeTab,
      });
      setAppointments(list);
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadOnChange() {
      setErrorMessage("");
      setIsLoading(true);

      try {
        const list = await fetchMyShopAppointments({
          date: selectedDate,
          tab: activeTab,
        });
        if (!cancelled) {
          setAppointments(list);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getAppointmentErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOnChange();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      try {
        const list = await fetchMyShopStaff();
        if (!cancelled) {
          setStaff(list.filter((member) => member.status === "ACTIVE"));
        }
      } catch {
        // Staff picker is optional; create can still use Any Available.
      }
    }

    void loadStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  const emptyCopy = useMemo(() => {
    if (activeTab === "past") {
      return "No completed appointments for this date.";
    }
    if (activeTab === "cancelled") {
      return "No cancelled appointments for this date.";
    }
    return "No upcoming appointments for this date.";
  }, [activeTab]);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      customerName: "",
      startTime: "10:00",
      endTime: "10:30",
      isWalkIn: true,
    });
    setFormError("");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalVisible(false);
    setForm(emptyForm);
    setFormError("");
  };

  const handleCreate = async () => {
    const customerName = form.customerName.trim();
    const customerPhone = form.customerPhone.trim();
    const serviceName = form.serviceName.trim();
    const priceRaw = form.priceInr.trim();
    const startTime = form.startTime.trim();
    const endTime = form.endTime.trim();

    if (!customerName) {
      setFormError("Customer name is required.");
      return;
    }
    if (!serviceName) {
      setFormError("Service is required.");
      return;
    }
    if (!priceRaw || Number.isNaN(Number(priceRaw))) {
      setFormError("Enter a valid price in ₹.");
      return;
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      setFormError("Times must be HH:mm (24h).");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      await createMyShopAppointment({
        customerName,
        customerPhone: customerPhone || undefined,
        serviceName,
        staffId: form.staffId || null,
        priceInr: Math.round(Number(priceRaw)),
        date: selectedDate,
        startTime,
        endTime,
        isWalkIn: form.isWalkIn,
      });
      setModalVisible(false);
      setForm(emptyForm);
      await loadAppointments();
    } catch (error) {
      setFormError(getAppointmentErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const patchStatus = async (
    appointment: ShopAppointment,
    status: AppointmentStatus,
  ) => {
    setActionId(appointment.id);
    setErrorMessage("");

    try {
      const updated = await updateMyShopAppointment(appointment.id, { status });
      // If status moved out of current tab, drop it; otherwise replace in place.
      const staysInTab =
        (activeTab === "upcoming" &&
          (updated.status === "PENDING" ||
            updated.status === "CONFIRMED" ||
            updated.status === "IN_PROGRESS")) ||
        (activeTab === "past" && updated.status === "COMPLETED") ||
        (activeTab === "cancelled" &&
          (updated.status === "CANCELLED" || updated.status === "REJECTED"));

      setAppointments((prev) =>
        staysInTab
          ? prev.map((item) => (item.id === updated.id ? updated : item))
          : prev.filter((item) => item.id !== updated.id),
      );
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  const confirmCancel = (appointment: ShopAppointment) => {
    Alert.alert(
      "Cancel appointment",
      `Cancel ${appointment.customerName}'s appointment?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel appointment",
          style: "destructive",
          onPress: () => {
            void patchStatus(appointment, "CANCELLED");
          },
        },
      ],
    );
  };

  const confirmReject = (appointment: ShopAppointment) => {
    Alert.alert(
      "Reject appointment",
      `Reject ${appointment.customerName}'s request?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            void patchStatus(appointment, "REJECTED");
          },
        },
      ],
    );
  };

  const callCustomer = async (appointment: ShopAppointment) => {
    const phone = appointment.customerPhone?.trim();
    if (!phone) {
      Alert.alert(
        "No phone number",
        "This appointment does not have a customer phone number.",
      );
      return;
    }

    const url = `tel:${phone.replace(/\s+/g, "")}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Unable to call", "Phone dialer is not available.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to call", "Could not open the phone dialer.");
    }
  };

  const renderActions = (appointment: ShopAppointment) => {
    const busy = actionId === appointment.id;

    if (appointment.status === "PENDING") {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => {
              void patchStatus(appointment, "CONFIRMED");
            }}
          >
            {busy ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.primaryActionText}>Accept</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => confirmReject(appointment)}
          >
            <Text style={styles.secondaryActionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      appointment.status === "CONFIRMED" ||
      appointment.status === "IN_PROGRESS"
    ) {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => {
              void patchStatus(appointment, "COMPLETED");
            }}
          >
            {busy ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.primaryActionText}>Mark as Completed</Text>
            )}
          </TouchableOpacity>
          {appointment.status === "CONFIRMED" ? (
            <TouchableOpacity
              style={[styles.secondaryAction, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={() => confirmCancel(appointment)}
            >
              <Text style={styles.secondaryActionText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.secondaryActionSpacer} />
          )}
        </View>
      );
    }

    return null;
  };

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
            <Text style={styles.heading}>Appointments</Text>
            <TouchableOpacity
              style={styles.addIconButton}
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel="Add appointment"
            >
              <Ionicons name="add" size={22} color="#111" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabChip, selected && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      selected && styles.tabChipTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity
              style={styles.dateNavBtn}
              onPress={() => setSelectedDate((prev) => addDays(prev, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>
              {formatDateLabel(selectedDate)}
            </Text>
            <TouchableOpacity
              style={styles.dateNavBtn}
              onPress={() => setSelectedDate((prev) => addDays(prev, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next day"
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadAppointments();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : appointments.length === 0 ? (
            <Text style={styles.emptyText}>{emptyCopy}</Text>
          ) : (
            appointments.map((appointment) => {
              const meta = statusMeta(appointment.status);
              return (
                <View key={appointment.id} style={styles.appointmentRow}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      {formatTime12h(appointment.startTime)} -{" "}
                      {formatTime12h(appointment.endTime)}
                    </Text>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => {
                        void callCustomer(appointment);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${appointment.customerName}`}
                    >
                      <Ionicons name="call" size={16} color="#111" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.detailLine}>
                    <Text style={styles.detailIcon}>👤 </Text>
                    {appointment.customerName}
                    {appointment.isWalkIn ? " (Walk-in)" : ""}
                  </Text>
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailIcon}>✂️ </Text>
                    {appointment.serviceName}
                  </Text>
                  <Text style={styles.detailLine}>
                    <Text style={styles.detailIcon}>💈 </Text>
                    Assigned to:{" "}
                    {appointment.staffName ?? "Any Available"}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.priceText}>
                      💵 {formatInr(appointment.priceInr)}
                    </Text>
                    <Text style={styles.metaDivider}>|</Text>
                    <View style={styles.statusInline}>
                      <Text style={styles.statusLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: meta.color },
                        ]}
                      />
                      <Text style={[styles.statusValue, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  {renderActions(appointment)}
                </View>
              );
            })
          )}
        </LinearGradient>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalAvoid}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Add Appointment</Text>
                <Text style={styles.modalSubtitle}>
                  For {formatDateLabel(selectedDate)}
                </Text>

                <Text style={styles.label}>Type</Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      form.isWalkIn && styles.statusChipActive,
                    ]}
                    onPress={() => setField("isWalkIn", true)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        form.isWalkIn && styles.statusChipTextActive,
                      ]}
                    >
                      Walk-in
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusChip,
                      !form.isWalkIn && styles.statusChipLeave,
                    ]}
                    onPress={() => setField("isWalkIn", false)}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        !form.isWalkIn && styles.statusChipTextActive,
                      ]}
                    >
                      Booked
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Customer name</Text>
                <TextInput
                  style={styles.input}
                  value={form.customerName}
                  onChangeText={(value) => setField("customerName", value)}
                  placeholder={
                    form.isWalkIn ? "Walk-in Customer" : "Customer name"
                  }
                  placeholderTextColor="#777"
                  editable={!isSaving}
                />

                <Text style={styles.label}>Phone (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.customerPhone}
                  onChangeText={(value) => setField("customerPhone", value)}
                  placeholder="Phone number"
                  placeholderTextColor="#777"
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />

                <Text style={styles.label}>Service</Text>
                <TextInput
                  style={styles.input}
                  value={form.serviceName}
                  onChangeText={(value) => setField("serviceName", value)}
                  placeholder="e.g. Haircut + Beard Trim"
                  placeholderTextColor="#777"
                  editable={!isSaving}
                />

                <Text style={styles.label}>Assigned staff</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.staffChipRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.staffChip,
                      !form.staffId && styles.staffChipActive,
                    ]}
                    onPress={() => setField("staffId", "")}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.staffChipText,
                        !form.staffId && styles.staffChipTextActive,
                      ]}
                    >
                      Any Available
                    </Text>
                  </TouchableOpacity>
                  {staff.map((member) => {
                    const selected = form.staffId === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.staffChip,
                          selected && styles.staffChipActive,
                        ]}
                        onPress={() => setField("staffId", member.id)}
                        disabled={isSaving}
                      >
                        <Text
                          style={[
                            styles.staffChipText,
                            selected && styles.staffChipTextActive,
                          ]}
                        >
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.label}>Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={form.priceInr}
                  onChangeText={(value) => setField("priceInr", value)}
                  placeholder="350"
                  placeholderTextColor="#777"
                  keyboardType="number-pad"
                  editable={!isSaving}
                />

                <View style={styles.timeFieldsRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.label}>Start (HH:mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.startTime}
                      onChangeText={(value) => setField("startTime", value)}
                      placeholder="10:00"
                      placeholderTextColor="#777"
                      autoCapitalize="none"
                      editable={!isSaving}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.label}>End (HH:mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.endTime}
                      onChangeText={(value) => setField("endTime", value)}
                      placeholder="10:30"
                      placeholderTextColor="#777"
                      autoCapitalize="none"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {formError ? (
                  <Text style={styles.errorText}>{formError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                  onPress={() => {
                    void handleCreate();
                  }}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSaving, busy: isSaving }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <Text style={styles.saveButtonText}>Create Appointment</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={closeModal}
                  disabled={isSaving}
                >
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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

  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  tabChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  tabChipActive: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.15)",
  },

  tabChipText: {
    color: "#8B8BA7",
    fontSize: 13,
    fontWeight: "600",
  },

  tabChipTextActive: {
    color: "#fff",
  },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },

  dateNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
  },

  dateNavLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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

  appointmentRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  timeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    paddingRight: 12,
  },

  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
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

  statusLabel: {
    color: "#8B8BA7",
    fontSize: 13,
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

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  primaryAction: {
    flex: 1.4,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  primaryActionText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
  },

  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  secondaryActionSpacer: {
    flex: 1,
  },

  secondaryActionText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },

  modalAvoid: {
    width: "100%",
  },

  modalSheet: {
    backgroundColor: "#14141F",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    maxHeight: "90%",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  modalSubtitle: {
    color: "#8B8BA7",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
  },

  label: {
    color: "#C9C9D6",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#1A1A26",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },

  statusToggleRow: {
    flexDirection: "row",
    gap: 10,
  },

  statusChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
  },

  statusChipActive: {
    borderColor: "#4ADE80",
    backgroundColor: "rgba(74,222,128,0.12)",
  },

  statusChipLeave: {
    borderColor: "#FBBF24",
    backgroundColor: "rgba(251,191,36,0.12)",
  },

  statusChipText: {
    color: "#8B8BA7",
    fontWeight: "600",
  },

  statusChipTextActive: {
    color: "#fff",
  },

  staffChipRow: {
    gap: 8,
    paddingRight: 8,
  },

  staffChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
  },

  staffChipActive: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.15)",
  },

  staffChipText: {
    color: "#8B8BA7",
    fontWeight: "600",
    fontSize: 13,
  },

  staffChipTextActive: {
    color: "#fff",
  },

  timeFieldsRow: {
    flexDirection: "row",
    gap: 10,
  },

  timeField: {
    flex: 1,
  },

  saveButton: {
    marginTop: 20,
    backgroundColor: "#F97316",
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
  },

  modalClose: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },

  modalCloseText: {
    color: "#8B8BA7",
    fontSize: 15,
    fontWeight: "600",
  },
});
