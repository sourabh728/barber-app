import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CancelBookingDialogProps = {
  visible: boolean;
  shopName?: string;
  busy?: boolean;
  onKeep: () => void;
  onConfirmCancel: () => void;
};

export function CancelBookingDialog({
  visible,
  shopName,
  busy = false,
  onKeep,
  onConfirmCancel,
}: CancelBookingDialogProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onKeep}
    >
      <Pressable
        style={styles.backdrop}
        onPress={busy ? undefined : onKeep}
      >
        <Pressable
          style={[styles.card, { marginBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="close-circle" size={48} color="#0B5A47" />
          </View>

          <Text style={styles.title}>Cancel this request?</Text>
          <Text style={styles.message}>
            {shopName
              ? `Your booking request at ${shopName} will be cancelled.`
              : "Your booking request will be cancelled."}{" "}
            You can book again later if you change your mind.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, busy ? styles.buttonDisabled : null]}
            onPress={onConfirmCancel}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Confirm cancel request"
            accessibilityState={{ disabled: busy, busy }}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Yes, cancel request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, busy ? styles.buttonDisabled : null]}
            onPress={onKeep}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Keep request"
          >
            <Text style={styles.secondaryButtonText}>Keep request</Text>
          </TouchableOpacity>
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
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    textAlign: "center",
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
