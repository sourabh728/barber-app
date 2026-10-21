import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IncomingBookingCallModal } from "@/components/incoming-booking-call-modal";
import { useSession } from "@/context/session-provider";
import {
  fetchMyPendingShopAppointments,
  getAppointmentErrorMessage,
  updateMyShopAppointment,
  type ShopAppointment,
} from "@/services/shop-appointments-api";
import {
  fetchMyShopStaff,
  type ShopStaff,
} from "@/services/shop-staff-api";
import { showAppAlert } from "@/utils/app-alert";

/**
 * App-wide host: polls PENDING requests for barbers and rings like an
 * incoming call until Accept / Decline.
 */
export function BarberIncomingCallHost() {
  const { session, user } = useSession();
  const insets = useSafeAreaInsets();
  const isBarber = user?.role === "BARBER";

  const [pending, setPending] = useState<ShopAppointment[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<ShopAppointment | null>(
    null,
  );
  const [assignStaffId, setAssignStaffId] = useState<string | null>(null);
  const [activeStaff, setActiveStaff] = useState<ShopStaff[]>([]);

  const loadPending = useCallback(async () => {
    if (!session || !isBarber) return;
    try {
      const list = await fetchMyPendingShopAppointments();
      setPending(list);
    } catch {
      // Keep last list; next poll retries.
    }
  }, [session, isBarber]);

  useEffect(() => {
    if (!session || !isBarber) {
      setPending([]);
      return;
    }

    void loadPending();
    const interval = setInterval(() => {
      void loadPending();
    }, 5000);

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void loadPending();
      }
    });

    let pushSub: { remove: () => void } | null = null;
    if (Platform.OS !== "web") {
      pushSub = Notifications.addNotificationReceivedListener(() => {
        void loadPending();
      });
    }

    return () => {
      clearInterval(interval);
      appSub.remove();
      pushSub?.remove();
    };
  }, [session, isBarber, loadPending]);

  const ringing =
    !acceptTarget && pending.length > 0 ? pending[0] : null;

  const patchStatus = async (
    appointment: ShopAppointment,
    status: "CONFIRMED" | "REJECTED",
    staffId?: string | null,
  ) => {
    setActionId(appointment.id);
    try {
      await updateMyShopAppointment(appointment.id, {
        status,
        ...(staffId !== undefined ? { staffId } : {}),
      });
      setAcceptTarget(null);
      setAssignStaffId(null);
      await loadPending();
    } catch (err) {
      showAppAlert("Could not update", getAppointmentErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const openAccept = async (appointment: ShopAppointment) => {
    if (appointment.staffId) {
      void patchStatus(appointment, "CONFIRMED");
      return;
    }
    try {
      const staffList = await fetchMyShopStaff();
      const active = staffList.filter(
        (item) => item.status === "ACTIVE" || item.status === "AWAY",
      );
      setActiveStaff(active);
      if (active.length === 0) {
        showAppAlert(
          "Add staff first",
          "This booking has no barber assigned. Add active staff, then accept.",
        );
        return;
      }
      setAssignStaffId(active.length === 1 ? active[0].id : null);
      setAcceptTarget(appointment);
    } catch (err) {
      showAppAlert("Could not load staff", getAppointmentErrorMessage(err));
    }
  };

  if (!session || !isBarber) {
    return null;
  }

  return (
    <>
      <IncomingBookingCallModal
        appointment={ringing}
        busy={ringing != null && actionId === ringing.id}
        onAccept={() => {
          if (ringing) void openAccept(ringing);
        }}
        onReject={() => {
          if (ringing) void patchStatus(ringing, "REJECTED");
        }}
        onSuggestSlot={() => {
          showAppAlert(
            "Suggest a time",
            "Open Home → Incoming Requests → Suggest slot to offer another time.",
          );
        }}
      />

      <Modal
        visible={Boolean(acceptTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAcceptTarget(null);
          setAssignStaffId(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setAcceptTarget(null);
            setAssignStaffId(null);
          }}
        >
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign barber</Text>
            <Text style={styles.modalHint}>
              Choose who will take this booking, then accept.
            </Text>
            <ScrollView contentContainerStyle={styles.staffList}>
              {activeStaff.map((member) => {
                const selected = assignStaffId === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.staffRow,
                      selected ? styles.staffRowSelected : null,
                    ]}
                    onPress={() => setAssignStaffId(member.id)}
                  >
                    <Text
                      style={[
                        styles.staffName,
                        selected ? styles.staffNameSelected : null,
                      ]}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.acceptConfirmButton}
              onPress={() => {
                if (!acceptTarget) return;
                if (!assignStaffId) {
                  showAppAlert(
                    "Select barber",
                    "Choose who will take this booking.",
                  );
                  return;
                }
                void patchStatus(acceptTarget, "CONFIRMED", assignStaffId);
              }}
            >
              <Text style={styles.acceptConfirmText}>Accept booking</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "70%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 12,
  },
  staffList: {
    gap: 8,
    paddingBottom: 12,
  },
  staffRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  staffRowSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#ECFDF5",
  },
  staffName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  staffNameSelected: {
    color: "#0B5A47",
  },
  acceptConfirmButton: {
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  acceptConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
