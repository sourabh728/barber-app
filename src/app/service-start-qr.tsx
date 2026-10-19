import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchBookingVerification,
  getVerificationErrorMessage,
  issueServiceStartQr,
  type BookingVerification,
  type ServiceStartQrResponse,
} from "@/services/verification-api";
import { showAppAlert } from "@/utils/app-alert";

export default function ServiceStartQrScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = Array.isArray(id) ? id[0] : id;
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [verification, setVerification] = useState<BookingVerification | null>(
    null,
  );
  const [serviceQr, setServiceQr] = useState<ServiceStartQrResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setError("Booking not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const v = await fetchBookingVerification(appointmentId);
      setVerification(v);
      if (v.arrivedAt && !v.actualStartAt) {
        const qr = await issueServiceStartQr(appointmentId);
        setServiceQr(qr);
      } else {
        setServiceQr(null);
      }
    } catch (err) {
      setError(getVerificationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Service QR</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.tint} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.content}>
          <View style={styles.banner}>
            <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
            <Text style={styles.bannerTitle}>You&apos;re checked in</Text>
            <Text style={styles.bannerBody}>
              Show this QR to your barber when they start your service. Arrival
              and start times are recorded automatically.
            </Text>
          </View>

          {verification?.arrivedAt ? (
            <Text style={styles.meta}>
              Arrival · {new Date(verification.arrivedAt).toLocaleTimeString()}
            </Text>
          ) : null}

          {verification?.actualStartAt ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneTitle}>Service already started</Text>
              <Text style={styles.meta}>
                Start ·{" "}
                {new Date(verification.actualStartAt).toLocaleTimeString()}
              </Text>
            </View>
          ) : serviceQr ? (
            <View style={styles.qrCard}>
              <QRCode value={serviceQr.qrPayload} size={220} backgroundColor="#fff" />
              <Text style={styles.expires}>
                Expires {new Date(serviceQr.expiresAt).toLocaleTimeString()}
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => {
                  void (async () => {
                    try {
                      const qr = await issueServiceStartQr(appointmentId!);
                      setServiceQr(qr);
                    } catch (err) {
                      showAppAlert(
                        "Could not refresh QR",
                        getVerificationErrorMessage(err),
                      );
                    }
                  })();
                }}
              >
                <Text style={styles.refreshText}>Refresh QR</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.error}>
              Check in at the shop first by scanning the shop QR.
            </Text>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace(`/history/${appointmentId}`)}
          >
            <Text style={styles.secondaryText}>View booking details</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    content: {
      flex: 1,
      alignItems: "center",
    },
    banner: {
      alignItems: "center",
      paddingHorizontal: 12,
      marginBottom: 16,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 8,
    },
    bannerBody: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 8,
    },
    meta: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 12,
    },
    qrCard: {
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 24,
      width: "100%",
    },
    expires: {
      marginTop: 14,
      color: "#64748B",
      fontSize: 13,
    },
    refreshBtn: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    refreshText: {
      color: colors.tint,
      fontWeight: "700",
    },
    doneCard: {
      width: "100%",
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
    },
    doneTitle: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 16,
      marginBottom: 6,
    },
    secondaryBtn: {
      marginTop: 24,
      padding: 14,
    },
    secondaryText: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    error: {
      color: "#DC2626",
      textAlign: "center",
      marginTop: 24,
      paddingHorizontal: 12,
    },
  });
}
