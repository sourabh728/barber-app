import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
  autoCloseAfterMs?: number;
  /** Opens the request details / waiting status screen. */
  onViewRequest: () => void;
  onResendRequest?: () => void;
  onBrowseOtherBarbers?: () => void;
  onBackHome?: () => void;
};

export function BookingSuccessDialog({
  visible,
  shopName,
  autoCloseAfterMs,
  onViewRequest,
  onResendRequest,
  onBrowseOtherBarbers,
  onBackHome,
}: BookingSuccessDialogProps) {
  const insets = useSafeAreaInsets();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTimedOut(false);
      return;
    }

    if (!autoCloseAfterMs || autoCloseAfterMs <= 0) {
      setTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setTimedOut(true);
    }, autoCloseAfterMs);

    return () => clearTimeout(timeoutId);
  }, [autoCloseAfterMs, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onViewRequest}
    >
      <Pressable style={styles.backdrop} onPress={onViewRequest}>
        <Pressable
          style={[
            timedOut ? styles.timeoutCard : styles.card,
            { marginBottom: Math.max(insets.bottom, 16) },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          {timedOut ? (
            <>
              <View style={styles.timeoutBadgeWrap}>
                <Ionicons name="time-outline" size={18} color="#F8FAFC" />
              </View>

              <Text style={styles.timeoutTitle}>
                Apologies, Barber is currently unavailable.
              </Text>

              <Text style={styles.timeoutBody}>
                It seems your request could not be attended to at this time, as
                the barber is busy with another allotted 45-second or has not
                responded within the allotted 45 seconds. We kindly suggest you
                try booking with a different available time slot or barber or
                exploring haircut quickly. Thank you for your patience.
              </Text>

              <View style={styles.timeoutPill}>
                <Ionicons name="warning-outline" size={14} color="#F8FAFC" />
                <Text style={styles.timeoutPillText}>NO BARBER RESPONSE</Text>
              </View>

              <TouchableOpacity
                style={styles.timeoutPrimaryButton}
                onPress={onResendRequest ?? onViewRequest}
                accessibilityRole="button"
                accessibilityLabel="Re-send request to this barber"
              >
                <Text style={styles.timeoutPrimaryText}>
                  RE-SEND REQUEST TO THIS BARBER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeoutSecondaryButton}
                onPress={onBrowseOtherBarbers ?? onViewRequest}
                accessibilityRole="button"
                accessibilityLabel="Browse other barbers"
              >
                <Text style={styles.timeoutSecondaryText}>
                  BROWSE OTHER BARBERS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeoutHomeButton}
                onPress={onBackHome ?? onViewRequest}
                accessibilityRole="button"
                accessibilityLabel="Back to home"
              >
                <Text style={styles.timeoutHomeText}>BACK TO HOME</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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

  timeoutCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1F2937",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
  },

  timeoutBadgeWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  timeoutTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 14,
  },

  timeoutBody: {
    color: "#E2E8F0",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 14,
  },

  timeoutPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
    alignSelf: "stretch",
    justifyContent: "center",
  },

  timeoutPillText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  timeoutPrimaryButton: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  timeoutPrimaryText: {
    color: "#F8FAFC",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  timeoutSecondaryButton: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  timeoutSecondaryText: {
    color: "#F8FAFC",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  timeoutHomeButton: {
    width: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
    paddingVertical: 15,
    alignItems: "center",
  },

  timeoutHomeText: {
    color: "#F8FAFC",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
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
