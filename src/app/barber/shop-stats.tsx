import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchMyShopStats,
  getShopStatsErrorMessage,
  type ShopStats,
} from "@/services/shop-stats-api";

type FocusSection = "bookings" | "reviews";

function parseFocus(value: string | string[] | undefined): FocusSection {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "reviews" ? "reviews" : "bookings";
}

export default function BarberShopStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const focus = parseFocus(params.focus);

  const [stats, setStats] = useState<ShopStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStats = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const next = await fetchMyShopStats();
      setStats(next);
    } catch (error) {
      setErrorMessage(getShopStatsErrorMessage(error));
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#14141F", "#0C0C14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Back to profile"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heading}>Shop Stats</Text>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadStats();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.section,
                  focus === "bookings" ? styles.sectionHighlight : null,
                ]}
              >
                <Text style={styles.sectionTitle}>Completed bookings</Text>
                <Text style={styles.statValue}>
                  {stats?.completedBookings ?? 0}
                </Text>
                <Text style={styles.sectionHint}>
                  All-time appointments marked completed for your shop.
                </Text>
              </View>

              <View
                style={[
                  styles.section,
                  focus === "reviews" ? styles.sectionHighlight : null,
                ]}
              >
                <Text style={styles.sectionTitle}>Rating & reviews</Text>
                <Text style={styles.statValue}>
                  {(stats?.ratingAverage ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.sectionMeta}>
                  {stats?.reviewCount ?? 0}{" "}
                  {(stats?.reviewCount ?? 0) === 1 ? "review" : "reviews"}
                </Text>
                <Text style={styles.emptyText}>No reviews yet</Text>
              </View>
            </>
          )}
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070C",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  loader: {
    marginTop: 32,
    marginBottom: 16,
  },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },

  sectionHighlight: {
    borderColor: "rgba(249,115,22,0.55)",
    backgroundColor: "rgba(249,115,22,0.08)",
  },

  sectionTitle: {
    color: "#C9C9D6",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },

  statValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },

  sectionHint: {
    color: "#8B8BA7",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  sectionMeta: {
    color: "#A5A5BC",
    fontSize: 14,
    marginTop: 6,
  },

  emptyText: {
    color: "#8B8BA7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },

  errorBox: {
    marginTop: 8,
  },

  errorText: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 8,
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
