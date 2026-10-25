import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchShopLeaderboard,
  getVerificationErrorMessage,
  type ShopLeaderboard,
} from "@/services/verification-api";

type Filter = { state: string | null; city: string | null; all: boolean };

function rankAccent(rank: number) {
  if (rank === 1) return "#EAB308";
  if (rank === 2) return "#94A3B8";
  if (rank === 3) return "#D97706";
  return null;
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Shop points leaderboard with state/city filters. Barbers start on their own
 * city (server default); admins start on all locations.
 */
export function ShopLeaderboardView() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<ShopLeaderboard | null>(null);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next: Filter | null) => {
    setLoading(true);
    try {
      const res = await fetchShopLeaderboard(
        next
          ? {
              state: next.state ?? undefined,
              city: next.city ?? undefined,
              all: next.all,
            }
          : {},
      );
      setData(res);
      setError(null);
    } catch (err) {
      setError(getVerificationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const applied = data?.appliedFilter;
  const activeState = filter ? filter.state : (applied?.state ?? null);
  const activeCity = filter ? filter.city : (applied?.city ?? null);

  const selectState = (state: string | null) =>
    setFilter({ state, city: null, all: state === null });
  const selectCity = (city: string | null) =>
    setFilter({ state: activeState, city, all: !activeState && !city });

  return (
    <View>
      <Text style={styles.label}>State</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          <Chip
            label="All"
            active={!activeState}
            onPress={() => selectState(null)}
            styles={styles}
          />
          {(data?.states ?? []).map((s) => (
            <Chip
              key={s}
              label={s}
              active={activeState?.toLowerCase() === s.toLowerCase()}
              onPress={() => selectState(s)}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>City</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          <Chip
            label="All"
            active={!activeCity}
            onPress={() => selectCity(null)}
            styles={styles}
          />
          {(data?.cities ?? []).map((c) => (
            <Chip
              key={c}
              label={c}
              active={activeCity?.toLowerCase() === c.toLowerCase()}
              onPress={() => selectCity(c)}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>

      {data?.myRank ? (
        <Text style={styles.myRank}>Your rank: #{data.myRank}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data && data.entries.length === 0 ? (
        <Text style={styles.empty}>No shops found for this location.</Text>
      ) : (
        <View style={{ gap: 10, marginTop: 12 }}>
          {(data?.entries ?? []).map((item) => {
            const accent = rankAccent(item.rank);
            return (
              <View
                key={item.shopId}
                style={[
                  styles.row,
                  accent ? { borderColor: accent, borderWidth: 1.5 } : null,
                  item.isMine
                    ? { borderColor: colors.primary, borderWidth: 2 }
                    : null,
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
                  <Text style={styles.name}>
                    {item.shopName}
                    {item.isMine ? " (You)" : ""}
                  </Text>
                  <Text style={styles.meta}>
                    {[item.city, item.state].filter(Boolean).join(", ")} ·{" "}
                    {item.scoredBookings} scored bookings
                  </Text>
                </View>
                <Text style={styles.points}>{item.totalPoints}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 10,
      marginBottom: 6,
    },
    chipRow: { flexDirection: "row", gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: colors.backgroundElement,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
    chipTextActive: { color: "#FFFFFF" },
    myRank: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: 15,
      marginTop: 14,
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
    rankText: { color: colors.text, fontWeight: "800", fontSize: 13 },
    name: { color: colors.text, fontSize: 16, fontWeight: "700" },
    meta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    points: { color: colors.primary, fontSize: 20, fontWeight: "800" },
    empty: { color: colors.textSecondary, textAlign: "center", marginTop: 32 },
    error: { color: "#DC2626", textAlign: "center", marginTop: 32 },
  });
}
