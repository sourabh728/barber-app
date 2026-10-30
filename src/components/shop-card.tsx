import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatShopAddress, type PublicShop } from "@/services/shops-api";
import { shopImageSource } from "@/utils/media";

const SHOP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "cut-outline",
  "storefront-outline",
];

type ShopCardProps = {
  shop: PublicShop;
  index?: number;
  /** Small caption above the shop name, e.g. "Booked 3 times". */
  caption?: string | null;
  onToggleFavorite: (shop: PublicShop) => void;
};

export function ShopCard({
  shop,
  index = 0,
  caption,
  onToggleFavorite,
}: ShopCardProps) {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const servicesServed = Math.max(0, shop.servicesServed ?? 0);
  const iconName = SHOP_ICONS[index % SHOP_ICONS.length];
  const isFavorite = Boolean(shop.isFavorite);
  const fullyBooked = Boolean(shop.allSlotsBooked);

  return (
    <View style={styles.shopCard}>
      <View style={styles.shopRow}>
        <View style={styles.shopIconWrap}>
          {shop.photoUrl ? (
            <Image
              source={shopImageSource(shop.photoUrl)}
              style={styles.shopThumb}
            />
          ) : (
            <Ionicons name={iconName} size={22} color="#475569" />
          )}
        </View>

        <View style={styles.shopMain}>
          <View style={styles.shopTopRow}>
            <View style={styles.shopCopy}>
              {caption ? <Text style={styles.caption}>{caption}</Text> : null}
              <Text style={styles.shopName} numberOfLines={1}>
                {shop.name}
              </Text>
              <Text style={styles.shopAddress} numberOfLines={2}>
                {formatShopAddress(shop)}
              </Text>
            </View>
            <View style={styles.servicesWrap}>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => onToggleFavorite(shop)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavorite }}
                accessibilityLabel={
                  isFavorite
                    ? `Remove ${shop.name} from favourite shops`
                    : `Add ${shop.name} to favourite shops`
                }
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavorite ? "#E11D48" : colors.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.servicesLabel}>Services served</Text>
              <Text style={styles.servicesValue}>{servicesServed}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bookButton, fullyBooked ? styles.bookButtonDisabled : null]}
            activeOpacity={0.85}
            disabled={fullyBooked}
            onPress={() =>
              router.push({
                pathname: "/shop/[id]",
                params: { id: shop.id },
              })
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: fullyBooked }}
            accessibilityLabel={
              fullyBooked
                ? `All slots booked at ${shop.name}`
                : `Book appointment at ${shop.name}`
            }
          >
            <Text
              style={[
                styles.bookButtonText,
                fullyBooked ? styles.bookButtonTextDisabled : null,
              ]}
            >
              {fullyBooked ? "All slots booked" : "Book Appointment"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    shopCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      padding: 10,
    },
    shopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    shopIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    shopThumb: {
      width: 44,
      height: 44,
    },
    shopMain: {
      flex: 1,
      gap: 8,
    },
    shopTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    shopCopy: {
      flex: 1,
      minWidth: 0,
    },
    caption: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    shopName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    shopAddress: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSecondary,
    },
    servicesWrap: {
      alignItems: "flex-end",
      minWidth: 72,
    },
    favoriteButton: {
      marginBottom: 2,
    },
    servicesLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "600",
      textAlign: "right",
    },
    servicesValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginTop: 1,
    },
    bookButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    bookButtonDisabled: {
      backgroundColor: colors.backgroundMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 12,
    },
    bookButtonTextDisabled: {
      color: colors.textSecondary,
    },
  });
}
