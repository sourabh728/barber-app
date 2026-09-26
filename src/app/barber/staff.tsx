import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  createMyShopStaff,
  deleteMyShopStaff,
  fetchMyShopStaff,
  getStaffErrorMessage,
  updateMyShopStaff,
  type ShopStaff,
  type StaffStatus,
} from "@/services/shop-staff-api";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";

type StaffFormState = {
  name: string;
  title: string;
  phone: string;
  status: StaffStatus;
  leaveReturnDate: string;
};

const emptyForm: StaffFormState = {
  name: "",
  title: "",
  phone: "",
  status: "ACTIVE",
  leaveReturnDate: "",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatLeaveBack(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formFromStaff(staff: ShopStaff): StaffFormState {
  return {
    name: staff.name,
    title: staff.title,
    phone: staff.phone,
    status: staff.status,
    leaveReturnDate: staff.leaveReturnDate ?? "",
  };
}

export default function BarberStaffScreen() {
  const router = useRouter();

  const [staff, setStaff] = useState<ShopStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ShopStaff | null>(null);
  const [form, setForm] = useState<StaffFormState>(emptyForm);

  const setField = useCallback(
    <K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFormError("");
    },
    [],
  );

  const loadStaff = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const list = await fetchMyShopStaff();
      setStaff(list);
    } catch (error) {
      setErrorMessage(getStaffErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOnMount() {
      setErrorMessage("");

      try {
        const list = await fetchMyShopStaff();
        if (!cancelled) {
          setStaff(list);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getStaffErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOnMount();

    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setEditingStaff(null);
    setForm(emptyForm);
    setFormError("");
    setModalVisible(true);
  };

  const openEdit = (member: ShopStaff) => {
    setEditingStaff(member);
    setForm(formFromStaff(member));
    setFormError("");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalVisible(false);
    setEditingStaff(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const title = form.title.trim();
    const phone = sanitizePhoneInput(form.phone);
    const leaveReturnDate = form.leaveReturnDate.trim();

    if (!name) {
      setFormError("Name is required.");
      return;
    }
    if (!title) {
      setFormError("Role / title is required.");
      return;
    }
    const phoneError = phoneValidationError(phone, { required: true });
    if (phoneError) {
      setFormError(phoneError);
      return;
    }
    if (form.status === "ON_LEAVE") {
      if (!leaveReturnDate) {
        setFormError("Return date is required when on leave.");
        return;
      }
      if (!DATE_RE.test(leaveReturnDate)) {
        setFormError("Return date must be YYYY-MM-DD.");
        return;
      }
    }

    setIsSaving(true);
    setFormError("");

    const payload = {
      name,
      title,
      phone,
      status: form.status,
      ...(form.status === "ON_LEAVE" ? { leaveReturnDate } : {}),
    };

    try {
      if (editingStaff) {
        const updated = await updateMyShopStaff(editingStaff.id, {
          ...payload,
          leaveReturnDate:
            form.status === "ON_LEAVE" ? leaveReturnDate : undefined,
        });
        setStaff((prev) =>
          prev
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        const created = await createMyShopStaff(payload);
        setStaff((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setModalVisible(false);
      setEditingStaff(null);
      setForm(emptyForm);
    } catch (error) {
      setFormError(getStaffErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (member: ShopStaff) => {
    Alert.alert(
      "Delete staff member",
      `Remove ${member.name} from your shop staff?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete(member.id);
          },
        },
      ],
    );
  };

  const handleDelete = async (staffId: string) => {
    setErrorMessage("");
    try {
      await deleteMyShopStaff(staffId);
      setStaff((prev) => prev.filter((item) => item.id !== staffId));
    } catch (error) {
      setErrorMessage(getStaffErrorMessage(error));
    }
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
            <Text style={styles.heading}>Manage Staff</Text>
            <View style={styles.headerSpacer} />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Add new staff member"
          >
            <Ionicons name="add" size={20} color="#111" />
            <Text style={styles.addButtonText}>ADD NEW STAFF MEMBER</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Current Staff ({staff.length})
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadStaff();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : staff.length === 0 ? (
            <Text style={styles.emptyText}>
              No staff members yet. Add your first team member above.
            </Text>
          ) : (
            staff.map((member) => (
              <View key={member.id} style={styles.staffRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initialsFromName(member.name)}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffTitle}>{member.title}</Text>
                  <Text style={styles.staffMeta}>Phone: {member.phone}</Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        member.status === "ACTIVE"
                          ? styles.statusDotActive
                          : styles.statusDotLeave,
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {member.status === "ACTIVE"
                        ? "Active Today"
                        : `On Leave (Back ${
                            member.leaveReturnDate
                              ? formatLeaveBack(member.leaveReturnDate)
                              : "TBD"
                          })`}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEdit(member)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${member.name}`}
                  >
                    <Ionicons name="pencil" size={18} color="#C9C9D6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => confirmDelete(member)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${member.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#F87171" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
              <Text style={styles.modalTitle}>
                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
              </Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(value) => setField("name", value)}
                placeholder="Full name"
                placeholderTextColor="#777"
                editable={!isSaving}
              />

              <Text style={styles.label}>Role / Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(value) => setField("title", value)}
                placeholder="e.g. Senior Barber"
                placeholderTextColor="#777"
                editable={!isSaving}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(value) =>
                  setField("phone", sanitizePhoneInput(value))
                }
                placeholder="10-digit mobile number"
                placeholderTextColor="#777"
                keyboardType="number-pad"
                maxLength={10}
                editable={!isSaving}
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    form.status === "ACTIVE" && styles.statusChipActive,
                  ]}
                  onPress={() => setField("status", "ACTIVE")}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      form.status === "ACTIVE" && styles.statusChipTextActive,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    form.status === "ON_LEAVE" && styles.statusChipLeave,
                  ]}
                  onPress={() => setField("status", "ON_LEAVE")}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      form.status === "ON_LEAVE" && styles.statusChipTextActive,
                    ]}
                  >
                    On Leave
                  </Text>
                </TouchableOpacity>
              </View>

              {form.status === "ON_LEAVE" ? (
                <>
                  <Text style={styles.label}>Return date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.leaveReturnDate}
                    onChangeText={(value) => setField("leaveReturnDate", value)}
                    placeholder="2026-10-01"
                    placeholderTextColor="#777"
                    editable={!isSaving}
                    autoCapitalize="none"
                  />
                </>
              ) : null}

              {formError ? (
                <Text style={styles.errorText}>{formError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={() => {
                  void handleSave();
                }}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving, busy: isSaving }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingStaff ? "Save Changes" : "Add Staff"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={closeModal}
                disabled={isSaving}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
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

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F97316",
    borderRadius: 16,
    minHeight: 52,
    marginBottom: 24,
  },

  addButtonText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  sectionTitle: {
    color: "#C9C9D6",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 14,
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

  staffRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A1A26",
    borderWidth: 1,
    borderColor: "#2A2A3A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#F97316",
    fontSize: 14,
    fontWeight: "700",
  },

  staffInfo: {
    flex: 1,
    minWidth: 0,
  },

  staffName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  staffTitle: {
    color: "#8B8BA7",
    fontSize: 14,
    marginTop: 2,
  },

  staffMeta: {
    color: "#C9C9D6",
    fontSize: 13,
    marginTop: 6,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusDotActive: {
    backgroundColor: "#4ADE80",
  },

  statusDotLeave: {
    backgroundColor: "#FBBF24",
  },

  statusText: {
    color: "#C9C9D6",
    fontSize: 13,
  },

  actionCol: {
    gap: 10,
    marginLeft: 8,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
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
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
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

  saveButton: {
    marginTop: 20,
    backgroundColor: "#F97316",
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
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
