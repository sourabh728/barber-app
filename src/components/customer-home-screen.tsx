import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";
import {
  fetchShops,
  getShopsErrorMessage,
  type PublicShop,
} from "@/services/shops-api";
import { shopImageSource } from "@/utils/media";

const PAGE_SIZE = 20;

function customerFirstName(name: string | undefined | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatShopLine(shop: PublicShop) {
  return [shop.address, shop.city, shop.state, shop.pincode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

const SHOP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "cut-outline",
  "storefront-outline",
];

export function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();

  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [draftCity, setDraftCity] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchShops({
        page,
        limit: PAGE_SIZE,
        search: debouncedQuery || undefined,
        city: selectedCity || undefined,
        state: selectedState || undefined,
      });
      setShops(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setCities(data.cities);
      setStates(data.states);
    } catch (err) {
      setError(getShopsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, selectedCity, selectedState]);

  useFocusEffect(
    useCallback(() => {
      void loadShops();
    }, [loadShops]),
  );

  const firstName = customerFirstName(user?.name);
  const hasActiveFilter = Boolean(selectedCity || selectedState);

  const openFilter = () => {
    setDraftCity(selectedCity);
    setDraftState(selectedState);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setSelectedCity(draftCity);
    setSelectedState(draftState);
    setPage(1);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setDraftCity(null);
    setDraftState(null);
    setSelectedCity(null);
    setSelectedState(null);
    setPage(1);
    setFilterOpen(false);
  };

  const renderShop = ({
    item,
    index,
  }: {
    item: PublicShop;
    index: number;
  }) => {
    const address = formatShopLine(item);
    const servicesServed = Math.max(0, item.servicesServed ?? 0);
    const iconName = SHOP_ICONS[index % SHOP_ICONS.length];

    return (
      <View style={styles.shopCard}>
        <View style={styles.shopRow}>
          <View style={styles.shopIconWrap}>
            {item.photoUrl ? (
              <Image
                source={shopImageSource(item.photoUrl)}
                style={styles.shopThumb}
              />
            ) : (
              <Ionicons name={iconName} size={22} color="#475569" />
            )}
          </View>

          <View style={styles.shopMain}>
            <View style={styles.shopTopRow}>
              <View style={styles.shopCopy}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.shopAddress} numberOfLines={2}>
                  {address}
                </Text>
              </View>
              <View style={styles.servicesWrap}>
                <Text style={styles.servicesLabel}>Services served</Text>
                <Text style={styles.servicesValue}>{servicesServed}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/shop/[id]",
                  params: { id: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Book appointment at ${item.name}`}
            >
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.customerName}>{firstName}</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search shops by name or address"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                accessibilityLabel="Search shops"
              />
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>All Barbers</Text>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  hasActiveFilter ? styles.filterButtonActive : null,
                ]}
                onPress={openFilter}
                accessibilityRole="button"
                accessibilityLabel="Filter shops"
              >
                <Ionicons
                  name="options-outline"
                  size={14}
                  color={hasActiveFilter ? "#FFFFFF" : "#0F172A"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    hasActiveFilter ? styles.filterButtonTextActive : null,
                  ]}
                >
                  Filter
                </Text>
              </TouchableOpacity>
            </View>

            {hasActiveFilter ? (
              <Text style={styles.filterSummary}>
                {[selectedCity, selectedState].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color="#0B5A47" />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void loadShops()}
                accessibilityRole="button"
                accessibilityLabel="Retry loading shops"
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>
                {debouncedQuery || hasActiveFilter
                  ? "No shops match your search or filters."
                  : "No shops available yet."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && !error && total > 0 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page <= 1 ? styles.pageButtonDisabled : null,
                ]}
                disabled={page <= 1 || loading}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page >= totalPages ? styles.pageButtonDisabled : null,
                ]}
                disabled={page >= totalPages || loading}
                onPress={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                accessibilityRole="button"
                accessibilityLabel="Next page"
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={renderShop}
        refreshing={loading && shops.length > 0}
        onRefresh={() => void loadShops()}
      />

      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter shops</Text>

            <Text style={styles.modalLabel}>City</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  draftCity === null ? styles.chipActive : null,
                ]}
                onPress={() => setDraftCity(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    draftCity === null ? styles.chipTextActive : null,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.chip,
                    draftCity === city ? styles.chipActive : null,
                  ]}
                  onPress={() => setDraftCity(city)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftCity === city ? styles.chipTextActive : null,
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>State</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  draftState === null ? styles.chipActive : null,
                ]}
                onPress={() => setDraftState(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    draftState === null ? styles.chipTextActive : null,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {states.map((state) => (
                <TouchableOpacity
                  key={state}
                  style={[
                    styles.chip,
                    draftState === state ? styles.chipActive : null,
                  ]}
                  onPress={() => setDraftState(state)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftState === state ? styles.chipTextActive : null,
                    ]}
                  >
                    {state}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilter}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilter}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 4,
  },

  greeting: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },

  customerName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 0,
    marginBottom: 12,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },

  sectionRow: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },

  filterButtonActive: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },

  filterButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },

  filterButtonTextActive: {
    color: "#FFFFFF",
  },

  filterSummary: {
    marginTop: -2,
    marginBottom: 8,
    color: "#64748B",
    fontSize: 12,
  },

  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    backgroundColor: "#F1F5F9",
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

  shopName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  shopAddress: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: "#64748B",
  },

  servicesWrap: {
    alignItems: "flex-end",
    minWidth: 72,
  },

  servicesLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "right",
  },

  servicesValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },

  bookButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0B5A47",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },

  pageButton: {
    backgroundColor: "#0B5A47",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  pageButtonDisabled: {
    opacity: 0.4,
  },

  pageButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  pageLabel: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13,
  },

  stateBlock: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },

  stateText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: "#0B5A47",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },

  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  modalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 4,
  },

  chipRow: {
    gap: 8,
    paddingBottom: 14,
  },

  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },

  chipActive: {
    backgroundColor: "#0B5A47",
    borderColor: "#0B5A47",
  },

  chipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  clearButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 14,
    alignItems: "center",
  },

  clearButtonText: {
    color: "#334155",
    fontWeight: "700",
  },

  applyButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#0B5A47",
    paddingVertical: 14,
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
