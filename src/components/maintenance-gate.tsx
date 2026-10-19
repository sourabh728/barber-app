import { useEffect, useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isPlatformAdminUser } from "@/constants/platform-admin";
import { useSession } from "@/context/session-provider";
import {
  fetchPublicSettings,
  type PublicAppSettings,
} from "@/services/public-settings-api";

/**
 * Full-screen maintenance for customers/barbers when the platform is offline.
 * Admins always pass through. Logged-out users can open Admin sign-in.
 */
export function MaintenanceGate({ children }: PropsWithChildren) {
  const { user } = useSession();
  const [settings, setSettings] = useState<PublicAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminSignIn, setAdminSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchPublicSettings();
        if (!cancelled) {
          setSettings(data);
        }
      } catch {
        if (!cancelled) {
          setSettings(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, 45_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (user && !isPlatformAdminUser(user)) {
      setAdminSignIn(false);
    }
  }, [user]);

  const isAdmin = isPlatformAdminUser(user);
  const untilMs = settings?.maintenanceUntil
    ? new Date(settings.maintenanceUntil).getTime()
    : null;
  const stillActive =
    Boolean(settings?.maintenanceEnabled) &&
    (untilMs == null || untilMs > Date.now());

  if (loading && !settings) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0B5A47" />
      </View>
    );
  }

  if (stillActive && !isAdmin && !adminSignIn) {
    const untilLabel =
      untilMs != null
        ? new Date(untilMs).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;

    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <Text style={styles.brand}>Trimshim</Text>
          <Text style={styles.title}>Under maintenance</Text>
          <Text style={styles.message}>
            {settings?.maintenanceMessage?.trim() ||
              "Trimshim is under maintenance. We’ll be back shortly."}
          </Text>
          {untilLabel ? (
            <Text style={styles.until}>Expected back: {untilLabel}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => setAdminSignIn(true)}
            accessibilityRole="button"
            accessibilityLabel="Admin sign in"
          >
            <Text style={styles.adminLinkText}>Admin sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6F1",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0B1F1A",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#122C26",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#1F4A40",
    gap: 10,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#6EE7B7",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: "#CBD5E1",
    marginTop: 4,
  },
  until: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  adminLink: {
    marginTop: 18,
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  adminLinkText: {
    color: "#6EE7B7",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
