import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type SameTimeApprovedInfo = {
  barberName: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
};

type BookForSomeoneDialogProps = {
  visible: boolean;
  conflict: SameTimeApprovedInfo | null;
  bookerName: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (guestName: string) => void;
};

export function BookForSomeoneDialog({
  visible,
  conflict,
  bookerName,
  busy = false,
  onClose,
  onConfirm,
}: BookForSomeoneDialogProps) {
  const insets = useSafeAreaInsets();
  const [guestName, setGuestName] = useState("");
  const [step, setStep] = useState<"ask" | "name">("ask");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (visible) {
      setGuestName("");
      setStep("ask");
      setFormError("");
    }
  }, [visible]);

  const previewName = guestName.trim()
    ? `${bookerName} (${guestName.trim()})`
    : `${bookerName} (…)`;

  const submitName = () => {
    const trimmed = guestName.trim();
    if (!trimmed) {
      setFormError("Enter the other person’s name.");
      return;
    }
    if (trimmed.length < 2) {
      setFormError("Name looks too short.");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onClose}
    >
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable
          style={[styles.card, { marginBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="people" size={40} color="#0B5A47" />
          </View>

          {step === "ask" ? (
            <>
              <Text style={styles.title}>Already booked at this time</Text>
              <Text style={styles.message}>
                You already have an approved request
                {conflict?.barberName
                  ? ` with ${conflict.barberName}`
                  : ""}
                {conflict?.timeLabel ? ` at ${conflict.timeLabel}` : ""}. Do you
                want to book for someone else on another chair?
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep("name")}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Book for someone else"
              >
                <Text style={styles.primaryButtonText}>
                  Yes, book for someone else
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Keep my current booking only"
              >
                <Text style={styles.secondaryButtonText}>No, keep mine only</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Who is this for?</Text>
              <Text style={styles.message}>
                Enter their name. The request will show as{" "}
                <Text style={styles.messageStrong}>{previewName}</Text> for the
                shop.
              </Text>

              <TextInput
                style={styles.input}
                value={guestName}
                onChangeText={(value) => {
                  setGuestName(value);
                  setFormError("");
                }}
                placeholder="Guest name"
                placeholderTextColor="#94A3B8"
                editable={!busy}
                autoFocus
                accessibilityLabel="Guest name"
              />

              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  busy ? styles.buttonDisabled : null,
                ]}
                onPress={submitName}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Send booking for guest"
                accessibilityState={{ disabled: busy, busy }}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send request</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setStep("ask");
                  setFormError("");
                }}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  message: {
    marginTop: 10,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    textAlign: "center",
  },

  messageStrong: {
    fontWeight: "800",
    color: "#0F172A",
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 10,
  },

  formError: {
    width: "100%",
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },

  primaryButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 50,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryButton: {
    width: "100%",
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingVertical: 13,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 15,
  },

  buttonDisabled: {
    opacity: 0.7,
  },
});
