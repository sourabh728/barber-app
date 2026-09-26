import { Ionicons } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchShopById,
  formatRatingAverage,
  formatRatingSummary,
  getShopsErrorMessage,
  type ShopDetail,
  type ShopReview,
} from "@/services/shops-api";

function formatReviewDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ShopReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = Array.isArray(id) ? id[0] : id;

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    if (!shopId) {
      setError("Shop not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchShopById(shopId);
      setShop(data);
    } catch (err) {
      setShop(null);
      setError(getShopsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      void loadShop();
    }, [loadShop]),
  );

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#0B5A47" size="large" />
      </View>
    );
  }

  if (error || !shop) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>{error ?? "Shop not found."}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reviews: ShopReview[] = shop.reviews ?? [];
  const ratingLabel = formatRatingSummary(shop.ratingAverage, shop.reviewCount);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Reviews</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.shopName}>{shop.name}</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="star" size={18} color="#F59E0B" />
          <Text style={styles.summaryText}>{ratingLabel}</Text>
        </View>
        <Text style={styles.averageHint}>
          Average {formatRatingAverage(shop.ratingAverage)} out of 5
        </Text>

        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptyText}>
              Reviews will show up here once customers start rating this shop.
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewer}>{review.customerName}</Text>
                <Text style={styles.reviewRating}>
                  {formatRatingAverage(review.rating)}/5
                </Text>
              </View>
              <Text style={styles.reviewDate}>
                {formatReviewDate(review.createdAt)}
              </Text>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  centered: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPlaceholder: {
    width: 40,
  },

  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  scrollContent: {
    paddingHorizontal: 20,
  },

  shopName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  summaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },

  averageHint: {
    marginTop: 4,
    marginBottom: 18,
    color: "#64748B",
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    gap: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
    gap: 6,
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  reviewer: {
    flex: 1,
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 15,
  },

  reviewRating: {
    fontWeight: "700",
    color: "#0B5A47",
  },

  reviewDate: {
    fontSize: 12,
    color: "#94A3B8",
  },

  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },

  backLink: {
    color: "#0B5A47",
    fontWeight: "600",
  },
});
