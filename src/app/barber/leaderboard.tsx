import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchWeeklyLeaderboard,
  getVerificationErrorMessage,
  type WeeklyLeaderboard,
} from "@/services/verification-api";

function rankAccent(rank: number) {
  if (rank === 1) return "#EAB308";
  if (rank === 2) return "#94A3B8";
  if (rank === 3) return "#D97706";
  return null;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<WeeklyLeaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void fetchWeeklyLeaderboard()
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
        <Text style={styles.title}>Weekly leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {data ? (
        <Text style={styles.weekLabel}>
          Week of {data.weekKey} · {data.shopName}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.tint} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={data?.entries ?? []}
          keyExtractor={(item) => item.staffId}
          contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No scored bookings this week yet. Complete verified services to
              rank staff.
            </Text>
          }
          renderItem={({ item }) => {
            const accent = rankAccent(item.rank);
            return (
              <View
                style={[
                  styles.row,
                  accent ? { borderColor: accent, borderWidth: 1.5 } : null,
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    accent ? { backgroundColor: accent } : null,
                  ]}
                >
                  <Text style={styles.rankText}>#{item.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.staffName}</Text>
                  <Text style={styles.meta}>
                    {item.eligibleBookings} bookings · avg punctuality{" "}
                    {item.averagePunctualityPoints}
                  </Text>
                </View>
                <Text style={styles.points}>{item.totalPoints}</Text>
              </View>
            );
          }}
        />
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
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    weekLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 16,
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      padding: 14,
    },
    rankBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    rankText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 13,
    },
    name: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    meta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    points: {
      color: colors.tint,
      fontSize: 20,
      fontWeight: "800",
    },
    empty: {
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 40,
      lineHeight: 22,
      paddingHorizontal: 12,
    },
    error: {
      color: "#DC2626",
      textAlign: "center",
      marginTop: 40,
    },
  });
}
