import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import type { ShopAppointment } from "@/services/shop-appointments-api";

type IncomingBookingCallModalProps = {
  appointment: ShopAppointment | null;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onSuggestSlot: () => void;
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

function formatDateLabel(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Full-screen “incoming call” UI for a PENDING booking request.
 * Rings with vibration + looping ringtone until the barber acts.
 */
export function IncomingBookingCallModal({
  appointment,
  busy = false,
  onAccept,
  onReject,
  onSuggestSlot,
}: IncomingBookingCallModalProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startRing() {
      if (!appointment) return;

      if (Platform.OS !== "web") {
        if (Platform.OS === "android") {
          Vibration.vibrate([0, 800, 400, 800, 400], true);
        } else {
          vibrateTimer.current = setInterval(() => {
            Vibration.vibrate(600);
          }, 1400);
        }
      }

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/incoming-booking.wav"),
          { isLooping: true, volume: 1 },
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // Vibration still alerts if audio fails.
      }
    }

    void startRing();

    return () => {
      cancelled = true;
      if (Platform.OS === "android") {
        Vibration.cancel();
      }
      if (vibrateTimer.current) {
        clearInterval(vibrateTimer.current);
        vibrateTimer.current = null;
      }
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) {
        void sound.stopAsync().finally(() => {
          void sound.unloadAsync();
        });
      }
    };
  }, [appointment?.id]);

  if (!appointment) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        // Must act — ignore back while ringing.
      }}
    >
      <LinearGradient
        colors={["#0B1220", "#0F766E", "#134E4A"]}
        style={styles.screen}
      >
        <Text style={styles.eyebrow}>Incoming booking request</Text>
        <Text style={styles.title}>New booking</Text>

        <View style={styles.pulse}>
          <View style={styles.avatar}>
            <Ionicons name="cut" size={42} color="#ECFDF5" />
          </View>
        </View>

        <Text style={styles.customer}>{appointment.customerName}</Text>
        <Text style={styles.meta}>
          {appointment.serviceName} · ₹
          {appointment.priceInr.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.slot}>
          {formatDateLabel(appointment.date)} ·{" "}
          {formatTime12h(appointment.startTime)} –{" "}
          {formatTime12h(appointment.endTime)}
        </Text>
        {appointment.staffName ? (
          <Text style={styles.staff}>Barber: {appointment.staffName}</Text>
        ) : (
          <Text style={styles.staff}>Barber: Any available</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.roundBtn, styles.rejectBtn]}
            disabled={busy}
            onPress={onReject}
            accessibilityRole="button"
            accessibilityLabel="Decline booking request"
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roundBtn, styles.acceptBtn]}
            disabled={busy}
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel="Accept booking request"
          >
            <Ionicons name="checkmark" size={34} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionLabels}>
          <Text style={styles.actionLabel}>Decline</Text>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>

        <TouchableOpacity
          style={styles.suggestBtn}
          disabled={busy}
          onPress={onSuggestSlot}
          accessibilityRole="button"
          accessibilityLabel="Suggest another slot"
        >
          <Ionicons name="time-outline" size={18} color="#ECFDF5" />
          <Text style={styles.suggestText}>Suggest another time</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  eyebrow: {
    color: "#99F6E4",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 28,
  },
  pulse: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(45, 212, 191, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#5EEAD4",
  },
  customer: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  meta: {
    color: "#CCFBF1",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  slot: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  staff: {
    color: "#99F6E4",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 36,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "70%",
    maxWidth: 280,
    marginBottom: 8,
  },
  roundBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#DC2626",
  },
  acceptBtn: {
    backgroundColor: "#16A34A",
  },
  actionLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%",
    maxWidth: 280,
    marginBottom: 28,
  },
  actionLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    width: 72,
    textAlign: "center",
  },
  suggestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(204, 251, 241, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  suggestText: {
    color: "#ECFDF5",
    fontSize: 14,
    fontWeight: "700",
  },
});
