import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  title: string;
  subtitle: string;
  onScan: (data: string) => Promise<void>;
};

export function QrScannerScreen({ title, subtitle, onScan }: Props) {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            busy
              ? undefined
              : ({ data }) => {
                  if (locked.current || !data) return;
                  locked.current = true;
                  setBusy(true);
                  setError(null);
                  void onScan(data)
                    .catch((err: unknown) => {
                      const message =
                        err instanceof Error ? err.message : "Scan failed";
                      setError(message);
                      locked.current = false;
                    })
                    .finally(() => setBusy(false));
                }
          }
        />
        <View style={styles.frame} />
      </View>

      {busy ? (
        <ActivityIndicator style={{ marginTop: 16 }} color={colors.tint} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
      marginBottom: 16,
      textAlign: "center",
    },
    cameraWrap: {
      flex: 1,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#000",
      minHeight: 320,
    },
    frame: {
      position: "absolute",
      top: "25%",
      left: "15%",
      right: "15%",
      bottom: "25%",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.85)",
      borderRadius: 16,
    },
    primaryBtn: {
      marginTop: 20,
      backgroundColor: colors.tint,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
    backBtn: {
      marginTop: 12,
      alignItems: "center",
      padding: 12,
    },
    backBtnText: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    error: {
      color: "#DC2626",
      textAlign: "center",
      marginTop: 12,
      marginBottom: 8,
      fontSize: 14,
    },
  });
}
