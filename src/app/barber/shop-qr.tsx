import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
  fetchShopQr,
  getVerificationErrorMessage,
  type ShopQrResponse,
} from "@/services/verification-api";

export default function ShopQrScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<ShopQrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void fetchShopQr()
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(getVerificationErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Shop QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        Print or display this code at the counter. Customers scan it to check in.
      </Text>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.tint} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : data ? (
          <>
            <QRCode value={data.qrPayload} size={220} backgroundColor="#fff" />
            <Text style={styles.shopName}>{data.shopName}</Text>
          </>
        ) : null}
      </View>
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
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 24,
    },
    card: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundElement,
      borderRadius: 20,
      padding: 28,
      minHeight: 320,
    },
    shopName: {
      marginTop: 20,
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    error: {
      color: "#DC2626",
      textAlign: "center",
    },
  });
}
