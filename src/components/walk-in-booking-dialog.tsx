import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createMyShopAppointment,
  getAppointmentErrorMessage,
} from "@/services/shop-appointments-api";
import {
  fetchMyShopServices,
  getShopServiceErrorMessage,
  type ShopServiceItem,
} from "@/services/shop-services-api";
import {
  fetchMyShopStaff,
  getStaffErrorMessage,
  type ShopStaff,
} from "@/services/shop-staff-api";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";

type WalkInBookingDialogProps = {
  visible: boolean;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onCreated: () => void;
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

export function WalkInBookingDialog({
  visible,
  date,
  startTime,
  endTime,
  onClose,
  onCreated,
}: WalkInBookingDialogProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<ShopServiceItem[]>([]);
  const [staff, setStaff] = useState<ShopStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (!visible) return;

    if (Platform.OS !== "web") {
      Vibration.vibrate(40);
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedServiceIds([]);
    setStaffId(null);
    setCustomerName("");
    setCustomerPhone("");

    void Promise.all([fetchMyShopServices(), fetchMyShopStaff()])
      .then(([serviceList, staffList]) => {
        if (cancelled) return;
        const activeServices = serviceList.filter((item) => item.active);
        const activeStaff = staffList.filter((item) => item.status === "ACTIVE");
        setServices(activeServices);
        setStaff(activeStaff);
        if (activeStaff.length === 1) {
          setStaffId(activeStaff[0].id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getShopServiceErrorMessage(err) || getStaffErrorMessage(err),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services],
  );

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.priceInr,
    0,
  );

  const toggleService = (id: string) => {
    setSelectedServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const submit = async () => {
    if (!staffId) {
      setError("Choose a service provider.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Select at least one service.");
      return;
    }
    const phone = customerPhone.trim();
    if (phone) {
      const phoneError = phoneValidationError(phone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      await createMyShopAppointment({
        customerName: customerName.trim() || undefined,
        customerPhone: phone || undefined,
        serviceName: selectedServices.map((service) => service.name).join(" + "),
        staffId,
        priceInr: totalPrice,
        date,
        startTime,
        endTime,
        isWalkIn: true,
        status: "CONFIRMED",
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(getAppointmentErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Add walk-in booking</Text>
          <Text style={styles.timeBanner}>
            {formatTime12h(startTime)} – {formatTime12h(endTime)}
          </Text>

          {loading ? (
            <ActivityIndicator color="#0B5A47" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Service provider</Text>
              {staff.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.empty}>
                    No active staff yet. Add barbers before walk-in booking.
                  </Text>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => {
                      onClose();
                      router.push("/barber/staff");
                    }}
                  >
                    <Text style={styles.linkButtonText}>Manage Staff</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.chipRow}>
                  {staff.map((member) => {
                    const selected = staffId === member.id;
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setStaffId(member.id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {member.name.split(/\s+/)[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>Services</Text>
              {services.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.empty}>
                    No services yet. Add your menu so walk-ins can be priced.
                  </Text>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => {
                      onClose();
                      router.push("/barber/services");
                    }}
                  >
                    <Text style={styles.linkButtonText}>Shop Services</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceRow,
                        selected && styles.serviceRowSelected,
                      ]}
                      onPress={() => toggleService(service.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceMeta}>
                          ₹{service.priceInr}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? "checkbox" : "square-outline"}
                        size={22}
                        color={selected ? "#0B5A47" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={styles.label}>Customer name (optional)</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Walk-in Customer"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={(value) =>
                  setCustomerPhone(sanitizePhoneInput(value))
                }
                keyboardType="phone-pad"
                placeholder="10-digit mobile"
                placeholderTextColor="#94A3B8"
                maxLength={10}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{totalPrice}</Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.65 }]}
                disabled={saving}
                onPress={() => void submit()}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Book walk-in</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  timeBanner: {
    marginTop: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "800",
    fontSize: 13,
    color: "#0B5A47",
    overflow: "hidden",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 8 },
  label: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  empty: { color: "#64748B", fontSize: 13, marginBottom: 8 },
  emptyBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    marginBottom: 8,
  },
  linkButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0B5A47",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  chipSelected: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },
  chipText: { fontWeight: "700", color: "#334155" },
  chipTextSelected: { color: "#FFFFFF" },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  serviceRowSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDF4",
  },
  serviceName: { fontWeight: "700", color: "#0F172A" },
  serviceMeta: { color: "#64748B", marginTop: 2, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  totalRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontWeight: "700", color: "#0F172A", fontSize: 16 },
  totalValue: { fontWeight: "800", color: "#0B5A47", fontSize: 18 },
  error: { color: "#B91C1C", marginTop: 10 },
  saveButton: {
    marginTop: 14,
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
