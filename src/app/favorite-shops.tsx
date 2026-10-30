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

import { ShopCard } from "@/components/shop-card";
import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchFavoriteShops,
  getShopsErrorMessage,
  setShopFavorite,
  type PublicShop,
} from "@/services/shops-api";
import { showAppAlert } from "@/utils/app-alert";

export default function FavoriteShopsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setShops(await fetchFavoriteShops());
    } catch (err) {
      setError(getShopsErrorMessage(err, "Could not load favourite shops."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const removeFavorite = useCallback(async (shop: PublicShop) => {
    setShops((current) => current.filter((item) => item.id !== shop.id));
    try {
      await setShopFavorite(shop.id, false);
    } catch (err) {
      setShops((current) =>
        current.some((item) => item.id === shop.id)
          ? current
          : [shop, ...current],
      );
      showAppAlert(
        "Favourite shops",
        getShopsErrorMessage(err, "Could not update favourite shops."),
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Favourite Shops</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <ShopCard
            shop={{ ...item, isFavorite: true }}
            index={index}
            onToggleFavorite={removeFavorite}
          />
        )}
        refreshing={loading && shops.length > 0}
        onRefresh={() => void load()}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void load()}
                accessibilityRole="button"
                accessibilityLabel="Retry loading favourite shops"
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stateBlock}>
              <Ionicons
                name="heart-outline"
                size={36}
                color={colors.textSecondary}
              />
              <Text style={styles.stateText}>
                No favourite shops yet. Tap the heart on a shop to save it here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      flexGrow: 1,
    },
    stateBlock: {
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    stateText: {
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 14,
    },
    retryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    retryText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
