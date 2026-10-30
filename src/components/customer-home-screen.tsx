import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

import { ShopCard } from "@/components/shop-card";
import { isPlatformAdminUser } from "@/constants/platform-admin";
import { useSession } from "@/context/session-provider";
import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchMyBookings,
  type CustomerBooking,
} from "@/services/customer-bookings-api";
import {
  fetchShops,
  fetchSuggestedShops,
  getShopsErrorMessage,
  setShopFavorite,
  type PublicShop,
  type SuggestedShop,
} from "@/services/shops-api";
import { showAppAlert } from "@/utils/app-alert";

const PAGE_SIZE = 20;

function customerFirstName(name: string | undefined | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatReminderDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  const today = toDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateKey(tomorrowDate);

  if (dateKey === today) return "Today";
  if (dateKey === tomorrow) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime12h(time24: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time24);
  if (!match) return time24;
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

/** Soonest accepted booking that has not ended yet. */
function pickNextAcceptedReminder(bookings: CustomerBooking[]) {
  const now = new Date();
  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming = bookings
    .filter((booking) => {
      if (
        booking.status !== "CONFIRMED" &&
        booking.status !== "IN_PROGRESS"
      ) {
        return false;
      }
      if (booking.date > todayKey) return true;
      if (booking.date < todayKey) return false;
      const endMatch = /^(\d{2}):(\d{2})$/.exec(booking.endTime);
      if (!endMatch) return true;
      const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
      return endMinutes > nowMinutes;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  return upcoming[0] ?? null;
}

export function CustomerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedShop[]>([]);
  const [acceptedReminder, setAcceptedReminder] =
    useState<CustomerBooking | null>(null);

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
        favoritesOnly,
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
  }, [debouncedQuery, favoritesOnly, page, selectedCity, selectedState]);

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggested(await fetchSuggestedShops());
    } catch {
      // Suggestions are optional; the main shop list still works.
      setSuggested([]);
    }
  }, []);

  const loadAcceptedReminder = useCallback(async () => {
    try {
      const [confirmed, inProgress] = await Promise.all([
        fetchMyBookings({ status: "CONFIRMED" }),
        fetchMyBookings({ status: "IN_PROGRESS" }),
      ]);
      setAcceptedReminder(
        pickNextAcceptedReminder([...confirmed, ...inProgress]),
      );
    } catch {
      // Home shops list should still work if history fetch fails.
      setAcceptedReminder(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadShops();
      void loadSuggestions();
      void loadAcceptedReminder();
    }, [loadAcceptedReminder, loadShops, loadSuggestions]),
  );

  const firstName = customerFirstName(user?.name);
  const hasActiveFilter = Boolean(selectedCity || selectedState);
  const showSuggestions =
    !favoritesOnly &&
    !hasActiveFilter &&
    !debouncedQuery &&
    page === 1 &&
    suggested.length > 0;

  const toggleFavorite = useCallback(
    async (shop: PublicShop) => {
      const next = !shop.isFavorite;
      const apply = (value: boolean) => {
        const patch = <T extends PublicShop>(items: T[]) =>
          items.map((item) =>
            item.id === shop.id ? { ...item, isFavorite: value } : item,
          );
        setShops((current) =>
          favoritesOnly && !value
            ? current.filter((item) => item.id !== shop.id)
            : patch(current),
        );
        setSuggested((current) => patch(current));
      };

      apply(next);
      try {
        await setShopFavorite(shop.id, next);
      } catch (err) {
        apply(!next);
        showAppAlert(
          "Favourite shops",
          getShopsErrorMessage(err, "Could not update favourite shops."),
        );
      }
    },
    [favoritesOnly],
  );

  const toggleFavoritesOnly = () => {
    setFavoritesOnly((current) => !current);
    setPage(1);
  };

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
  }) => (
    <ShopCard
      shop={item}
      index={index}
      onToggleFavorite={toggleFavorite}
    />
  );

  if (isPlatformAdminUser(user)) {
    return <Redirect href="/admin" />;
  }

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

            {acceptedReminder ? (
              <View style={styles.reminderCard}>
                <TouchableOpacity
                  style={styles.reminderMain}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push(`/history/${acceptedReminder.id}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Appointment confirmed at ${acceptedReminder.shopName}`}
                >
                  <View style={styles.reminderIconWrap}>
                    <Ionicons name="checkmark-circle" size={18} color="#0B5A47" />
                  </View>
                  <View style={styles.reminderCopy}>
                    <Text style={styles.reminderEyebrow}>
                      {acceptedReminder.status === "IN_PROGRESS"
                        ? "In progress now"
                        : acceptedReminder.arrivedAt
                          ? "Checked in — show service QR"
                          : "Appointment confirmed"}
                    </Text>
                    <Text style={styles.reminderTitle} numberOfLines={1}>
                      {acceptedReminder.shopName}
                    </Text>
                    <Text style={styles.reminderMeta} numberOfLines={2}>
                      {formatReminderDate(acceptedReminder.date)} ·{" "}
                      {formatTime12h(acceptedReminder.startTime)}
                      {acceptedReminder.serviceName
                        ? ` · ${acceptedReminder.serviceName}`
                        : ""}
                      {acceptedReminder.staffName
                        ? ` · ${acceptedReminder.staffName}`
                        : ""}
                    </Text>
                    {acceptedReminder.status === "CONFIRMED" &&
                    !acceptedReminder.arrivedAt ? (
                      <Text style={styles.reminderHint}>
                        At the shop? Tap the scan icon to check in.
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                {acceptedReminder.status === "CONFIRMED" &&
                !acceptedReminder.actualStartAt ? (
                  <TouchableOpacity
                    style={styles.scanIconBtn}
                    onPress={() => {
                      if (acceptedReminder.arrivedAt) {
                        router.push(
                          `/service-start-qr?id=${acceptedReminder.id}`,
                        );
                      } else {
                        router.push({
                          pathname: "/scan-shop-qr",
                          params: { appointmentId: acceptedReminder.id },
                        });
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      acceptedReminder.arrivedAt
                        ? "Show service QR for barber"
                        : "Scan shop QR to check in"
                    }
                  >
                    <Ionicons
                      name={
                        acceptedReminder.arrivedAt ? "qr-code" : "scan-outline"
                      }
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#0B5A47" />
                )}
              </View>
            ) : null}

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

            {showSuggestions ? (
              <View style={styles.suggestionBlock}>
                <Text style={styles.sectionTitle}>Book again</Text>
                <Text style={styles.suggestionHint}>
                  Shops you visit often
                </Text>
                {suggested.map((shop, index) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    index={index}
                    caption={`Booked ${shop.bookingCount} times`}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                {favoritesOnly ? "Favourite Barbers" : "All Barbers"}
              </Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    favoritesOnly ? styles.favoriteButtonActive : null,
                  ]}
                  onPress={toggleFavoritesOnly}
                  accessibilityRole="button"
                  accessibilityState={{ selected: favoritesOnly }}
                  accessibilityLabel="Show favourite shops only"
                >
                  <Ionicons
                    name={favoritesOnly ? "heart" : "heart-outline"}
                    size={14}
                    color={favoritesOnly ? "#FFFFFF" : "#E11D48"}
                  />
                  <Text
                    style={[
                      styles.filterButtonText,
                      favoritesOnly ? styles.filterButtonTextActive : null,
                    ]}
                  >
                    Favourite
                  </Text>
                </TouchableOpacity>
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
                {favoritesOnly && !debouncedQuery && !hasActiveFilter
                  ? "You have no favourite shops yet. Tap the heart on a shop to save it."
                  : debouncedQuery || hasActiveFilter
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
        onRefresh={() => {
          void loadShops();
          void loadSuggestions();
          void loadAcceptedReminder();
        }}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    fontWeight: "500",
  },

  customerName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginTop: 0,
    marginBottom: 12,
  },

  reminderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  scanIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B5A47",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  reminderHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#0B5A47",
    fontWeight: "600",
  },

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.backgroundSelected,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },

  reminderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
  },

  reminderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  reminderEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  reminderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },

  reminderMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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
    color: colors.text,
  },

  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.backgroundCard,
  },

  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },

  filterButtonTextActive: {
    color: "#FFFFFF",
  },

  filterSummary: {
    marginTop: -2,
    marginBottom: 8,
    color: colors.textSecondary,
    fontSize: 12,
  },

  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  favoriteButtonActive: {
    backgroundColor: "#E11D48",
    borderColor: "#E11D48",
  },

  suggestionBlock: {
    marginTop: 14,
  },

  suggestionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
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
    backgroundColor: colors.primary,
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
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  retryButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.backgroundCard,
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
    color: colors.text,
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
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
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    color: colors.textSecondary,
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
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },

  clearButtonText: {
    color: colors.textSecondary,
    fontWeight: "700",
  },

  applyButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
}

