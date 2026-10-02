import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";
import {
  DEFAULT_SHOP_SERVICES,
  fetchShops,
  formatShopAddress,
  getShopsErrorMessage,
  type PublicShop,
} from "@/services/shops-api";
import { shopImageSource } from "@/utils/media";

const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  haircut: "cut-outline",
  beard: "man-outline",
  "haircut-beard": "sparkles-outline",
  spa: "water-outline",
  color: "color-palette-outline",
  kids: "happy-outline",
};

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const isBarber = user?.role === "BARBER";

  const [shops, setShops] = useState<PublicShop[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const load = useCallback(async (city?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShops({
        page: 1,
        limit: 8,
        city: city || undefined,
      });
      setShops(data.items);
      setCities(data.cities);
    } catch (err) {
      setError(getShopsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(selectedCity);
    }, [load, selectedCity]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>
          {isBarber
            ? "See how customers discover shops and services."
            : "Browse services and find shops by city."}
        </Text>

        <Text style={styles.sectionTitle}>Popular services</Text>
        <View style={styles.serviceGrid}>
          {DEFAULT_SHOP_SERVICES.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceIconWrap}>
                <Ionicons
                  name={SERVICE_ICONS[service.id] ?? "cut-outline"}
                  size={22}
                  color="#0B5A47"
                />
              </View>
              <Text style={styles.serviceName} numberOfLines={2}>
                {service.name}
              </Text>
              <Text style={styles.servicePrice}>From ₹{service.priceInr}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Browse by city</Text>
        {cities.length === 0 && !loading ? (
          <Text style={styles.emptyHint}>No cities yet. Check back soon.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityRow}
          >
            <TouchableOpacity
              style={[
                styles.cityChip,
                selectedCity === null && styles.cityChipActive,
              ]}
              onPress={() => setSelectedCity(null)}
              accessibilityRole="button"
              accessibilityLabel="All cities"
            >
              <Text
                style={[
                  styles.cityChipText,
                  selectedCity === null && styles.cityChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {cities.map((city) => {
              const active = selectedCity === city;
              return (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityChip, active && styles.cityChipActive]}
                  onPress={() => setSelectedCity(city)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${city}`}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      active && styles.cityChipTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitleInline}>
            {selectedCity ? `Shops in ${selectedCity}` : "Shops to try"}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="See all shops on Home"
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0B5A47" style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : shops.length === 0 ? (
          <Text style={styles.emptyHint}>No shops found for this filter.</Text>
        ) : (
          shops.map((shop) => (
            <TouchableOpacity
              key={shop.id}
              style={styles.shopCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/shop/[id]",
                  params: { id: shop.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open ${shop.name}`}
            >
              <Image
                source={shopImageSource(shop.photoUrl)}
                style={styles.shopImage}
              />
              <View style={styles.shopBody}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.shopAddress} numberOfLines={2}>
                  {formatShopAddress(shop)}
                </Text>
                <Text style={styles.bookHint}>Book appointment →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {!isBarber ? (
          <View style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={22} color="#0B5A47" />
            <Text style={styles.tipText}>
              Tip: use Home to search by name or address, and filter by city or
              state.
            </Text>
          </View>
        ) : (
          <View style={styles.tipCard}>
            <Ionicons name="storefront-outline" size={22} color="#0B5A47" />
            <Text style={styles.tipText}>
              Keep your shop photo and city updated so you show up clearly in
              Explore.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F6",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 15,
    color: "#64748B",
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionRow: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleInline: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  seeAll: {
    color: "#0B5A47",
    fontWeight: "700",
    fontSize: 14,
  },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  serviceCard: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    maxWidth: "32%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    minHeight: 34,
  },
  servicePrice: {
    marginTop: 4,
    fontSize: 12,
    color: "#0B5A47",
    fontWeight: "600",
  },
  cityRow: {
    gap: 8,
    paddingBottom: 4,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cityChipActive: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },
  cityChipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  cityChipTextActive: {
    color: "#FFFFFF",
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    marginBottom: 12,
  },
  emptyHint: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 12,
  },
  shopCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shopImage: {
    width: 96,
    height: 96,
  },
  shopBody: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  shopName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  shopAddress: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  bookHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#0B5A47",
  },
  tipCard: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#334155",
  },
});
