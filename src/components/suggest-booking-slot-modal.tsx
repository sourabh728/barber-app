import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchMyShopAppointments,
  getAppointmentErrorMessage,
  updateMyShopAppointment,
  type ShopAppointment,
} from "@/services/shop-appointments-api";
import { fetchMyShopSchedule } from "@/services/shop-schedule-api";
import { showAppAlert } from "@/utils/app-alert";
import {
  buildSuggestedSlots,
  formatSuggestedTime,
  minutesToTime,
  suggestedBookingDuration,
  timeToMinutes,
} from "@/utils/suggest-booking-slots";

type Props = {
  appointment: ShopAppointment | null;
  onClose: () => void;
  onSuggested: (appointment: ShopAppointment) => void;
};

export function SuggestBookingSlotModal({ appointment, onClose, onSuggested }: Props) {
  if (!appointment) return null;
  return <SuggestBookingSlotSheet key={appointment.id} appointment={appointment} onClose={onClose} onSuggested={onSuggested} />;
}

function SuggestBookingSlotSheet({ appointment, onClose, onSuggested }: Omit<Props, "appointment"> & { appointment: ShopAppointment }) {
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<{ slots: string[]; error: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchMyShopSchedule(),
      fetchMyShopAppointments({ date: appointment.date, tab: "upcoming" }),
    ]).then(([schedule, appointments]) => {
      if (active) setResult({ slots: buildSuggestedSlots(schedule, appointment, appointments), error: "" });
    }).catch((err: unknown) => {
      if (active) setResult({ slots: [], error: getAppointmentErrorMessage(err) });
    });

    return () => { active = false; };
  }, [appointment, retry]);

  const submit = async (startTime: string) => {
    if (!appointment || submitting) return;
    const start = timeToMinutes(startTime);
    if (start === null) {
      setError("The selected time is invalid. Please try another slot.");
      return;
    }
    const endTime = minutesToTime(start + suggestedBookingDuration(appointment));
    setSubmitting(true);
    setError("");
    try {
      const updated = await updateMyShopAppointment(appointment.id, {
        startTime,
        endTime,
        proposeSlot: true,
      });
      onSuggested(updated);
      showAppAlert(
        "Time suggested",
        `The customer was notified about ${formatSuggestedTime(startTime)}–${formatSuggestedTime(endTime)} and can accept or decline.`,
      );
    } catch (err) {
      setError(getAppointmentErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => {
      if (!submitting) onClose();
    }}>
      <Pressable style={styles.backdrop} onPress={() => { if (!submitting) onClose(); }}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Suggest next slot</Text>
          <Text style={styles.hint}>
            Pick an open time for {appointment?.customerName || "this customer"} on {appointment?.date}. They will get a notification.
          </Text>
          {!result ? <ActivityIndicator color="#0B5A47" /> : null}
          {error || result?.error ? (
            <View>
              <Text style={styles.error} accessibilityLiveRegion="polite">{error || result?.error}</Text>
              <TouchableOpacity onPress={() => {
                setError("");
                setResult(null);
                setRetry((value) => value + 1);
              }} disabled={submitting}>
                <Text style={styles.retry}>Refresh available slots</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {result && !result.error && !error && result.slots.length === 0 ? (
            <Text style={styles.hint}>No open slots are available on this date. Choose another action or ask the customer to pick another day.</Text>
          ) : null}
          <ScrollView contentContainerStyle={styles.list}>
            {!error && result && !result.error ? result.slots.map((slot) => {
              const start = timeToMinutes(slot);
              const end = start === null || !appointment ? slot : minutesToTime(start + suggestedBookingDuration(appointment));
              return (
                <TouchableOpacity key={slot} style={styles.option} disabled={submitting} onPress={() => void submit(slot)} accessibilityRole="button">
                  <Text style={styles.optionText}>{formatSuggestedTime(slot)} – {formatSuggestedTime(end)}</Text>
                </TouchableOpacity>
              );
            }) : null}
          </ScrollView>
          {submitting ? <ActivityIndicator color="#0B5A47" /> : (
            <TouchableOpacity onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, maxHeight: "70%" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  hint: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  list: { gap: 8, paddingBottom: 12 },
  option: { borderWidth: 1, borderColor: "#A7F3D0", backgroundColor: "#ECFDF5", borderRadius: 12, padding: 14 },
  optionText: { color: "#0B5A47", fontWeight: "700" },
  error: { color: "#B91C1C", marginBottom: 8 },
  retry: { color: "#0B5A47", fontWeight: "700", marginBottom: 12 },
  cancel: { color: "#475569", textAlign: "center", fontWeight: "700", padding: 12 },
});
