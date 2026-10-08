import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookingSuccessDialogProps = {
  visible: boolean;
  shopName?: string;
  /** Opens the request details / waiting status screen. */
  onViewRequest: () => void;
};

export function BookingSuccessDialog({
  visible,
  shopName,
  onViewRequest,
}: BookingSuccessDialogProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onViewRequest}
    >
      <Pressable style={styles.backdrop} onPress={onViewRequest}>
        <Pressable
          style={[styles.card, { marginBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          </View>

          <Text style={styles.title}>Request sent</Text>
          <Text style={styles.message}>
            {shopName
              ? `Your booking request was sent to ${shopName}.`
              : "Your booking request was sent to the shop."}{" "}
            Please wait for the barber to accept or decline — don’t book
            elsewhere until you see the result.
          </Text>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Pending approval</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onViewRequest}
            accessibilityRole="button"
            accessibilityLabel="View request status"
          >
            <Ionicons name="time-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>View request status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onViewRequest}
            accessibilityRole="button"
            accessibilityLabel="OK"
          >
            <Text style={styles.secondaryButtonText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
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
    borderColor: "#DCFCE7",
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#14532D",
    textAlign: "center",
  },

  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    textAlign: "center",
  },

  statusPill: {
    marginTop: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
  },

  statusText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 12,
  },

  primaryButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
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
});
