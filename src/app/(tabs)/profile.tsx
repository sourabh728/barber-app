import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { useSession } from "@/context/session-provider";
import type { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchMyBookingStats,
  getCustomerBookingErrorMessage,
} from "@/services/customer-bookings-api";
import {
  fetchMyShopStats,
  getShopStatsErrorMessage,
} from "@/services/shop-stats-api";
import { fetchUnreadNotificationCount } from "@/services/notifications-api";
import { profileImageSource } from "@/utils/media";

export default function Profile() {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut, user } = useSession();
  const isBarber = user?.role === "BARBER";
  const displayName = user?.name?.trim() || user?.email || "Account";
  const displayContact = user?.phone?.trim() || user?.email || "";
  const roleLabel =
    user?.role === "BARBER"
      ? "Barber"
      : user?.role === "ADMIN"
        ? "Admin"
        : null;

  const [completedBookings, setCompletedBookings] = useState(0);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadStats() {
        setStatsLoading(true);
        try {
          // Barbers see their shop's completed bookings; customers see their own.
          if (isBarber) {
            const stats = await fetchMyShopStats();
            if (cancelled) return;
            setCompletedBookings(stats.completedBookings);
            setRatingAverage(stats.ratingAverage);
          } else {
            const stats = await fetchMyBookingStats();
            if (cancelled) return;
            setCompletedBookings(stats.completedBookings);
          }
        } catch (error) {
          if (cancelled) return;
          // Keep last known values; surface only for debugging.
          if (__DEV__) {
            console.warn(
              isBarber
                ? getShopStatsErrorMessage(error)
                : getCustomerBookingErrorMessage(error),
            );
          }
        } finally {
          if (!cancelled) {
            setStatsLoading(false);
          }
        }
      }

      async function loadUnread() {
        try {
          const count = await fetchUnreadNotificationCount();
          if (!cancelled) {
            setUnreadNotifications(count);
          }
        } catch {
          // Keep last known count.
        }
      }

      void loadStats();
      void loadUnread();

      return () => {
        cancelled = true;
      };
    }, [isBarber]),
  );

  const openShopStats = (focus: "bookings" | "reviews") => {
    router.push({
      pathname: "/barber/shop-stats",
      params: { focus },
    });
  };

  const openBookings = () => {
    if (isBarber) {
      openShopStats("bookings");
      return;
    }
    router.push("/history");
  };

  const bookingsDisplay = String(completedBookings);
  const ratingDisplay = isBarber ? String(ratingAverage) : "45";
  const ratingLabel = isBarber ? "Rating" : "Reviews";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.profileTitle}>Profile</Text>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.userRow}>
          <Image
            source={profileImageSource(user?.photoUrl)}
            style={styles.avatar}
          />

          <View>
            <Text style={styles.name}>{displayName}</Text>
            {displayContact ? (
              <Text style={styles.phone}>{displayContact}</Text>
            ) : null}
            {roleLabel ? (
              <Text style={styles.role}>{roleLabel}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.stat}
          onPress={openBookings}
          accessibilityRole="button"
          accessibilityLabel={
            isBarber ? "View completed bookings" : "View booking history"
          }
        >
          {statsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{bookingsDisplay}</Text>
          )}
          <Text style={styles.statLabel}>Bookings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {isBarber ? (
          <TouchableOpacity
            style={styles.stat}
            onPress={() => openShopStats("reviews")}
            accessibilityRole="button"
            accessibilityLabel="View rating and reviews"
          >
            {statsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.statNumber}>{ratingDisplay}</Text>
            )}
            <Text style={styles.statLabel}>{ratingLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{ratingDisplay}</Text>
            <Text style={styles.statLabel}>{ratingLabel}</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: "#D4AF37" }]}>150</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {isBarber ? (
          <>
            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="storefront" size={22} color="#2563EB" />}
              title="Edit Shop Profile"
              onPress={() => {
                router.push("/edit-profile");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={
                <Ionicons name="calendar-outline" size={22} color="#0B5A47" />
              }
              title="Shop Schedule"
              onPress={() => {
                router.push("/barber/schedule");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="people" size={22} color="#7C3AED" />}
              title="Manage Staff"
              onPress={() => {
                router.push("/barber/staff");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={
                <Ionicons name="pricetag-outline" size={22} color="#0F766E" />
              }
              title="Shop Services"
              onPress={() => {
                router.push("/barber/services");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="cut" size={22} color="#EA580C" />}
              title="Appointments"
              onPress={() => {
                router.push("/barber/appointments");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="notifications" size={22} color="#F59E0B" />}
              title={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications})`
                  : "Notifications"
              }
              onPress={() => {
                router.push("/notifications");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Feather name="help-circle" size={22} color="#475569" />}
              title="Help & Support"
              onPress={() => {
                router.push("/help-support");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<MaterialIcons name="logout" size={22} color="#DC2626" />}
              title="Logout"
              onPress={() => {
                void signOut();
              }}
            />
          </>
        ) : (
          <>
            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="person" size={22} color="#2563EB" />}
              title="Edit Profile"
              onPress={() => {
                router.push("/edit-profile");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="time" size={22} color="#EA580C" />}
              title="History"
              onPress={() => {
                router.push("/history");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="notifications" size={22} color="#F59E0B" />}
              title={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications})`
                  : "Notifications"
              }
              onPress={() => {
                router.push("/notifications");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Ionicons name="wallet" size={22} color="#22C55E" />}
              title="Payment Methods"
              onPress={() => {
                router.push("/payment-methods");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<Feather name="help-circle" size={22} color="#475569" />}
              title="Help & Support"
              onPress={() => {
                router.push("/help-support");
              }}
            />

            <MenuItem
              colors={colors}
              styles={styles}
              icon={<MaterialIcons name="logout" size={22} color="#DC2626" />}
              title="Logout"
              onPress={() => {
                void signOut();
              }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
  colors,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  colors: AppColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.iconCircle}>{icon}</View>

      <Text style={styles.menuTitle}>{title}</Text>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    header: {
      backgroundColor: colors.header,
      paddingTop: 60,
      paddingHorizontal: 25,
      paddingBottom: 35,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
    },

    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    profileTitle: {
      color: colors.headerText,
      fontSize: 34,
      fontWeight: "700",
    },

    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },

    userRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 35,
    },

    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginRight: 18,
      borderWidth: 4,
      borderColor: "rgba(255,255,255,0.4)",
    },

    name: {
      color: colors.headerText,
      fontSize: 30,
      fontWeight: "700",
    },

    phone: {
      color: colors.headerText,
      fontSize: 17,
      marginTop: 6,
    },

    role: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      marginTop: 4,
      fontWeight: "600",
    },

    statsContainer: {
      backgroundColor: colors.backgroundCard,
      marginHorizontal: 20,
      marginTop: -28,
      borderRadius: 20,
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 22,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },

    stat: {
      alignItems: "center",
      flex: 1,
    },

    divider: {
      width: 1,
      backgroundColor: colors.border,
    },

    statNumber: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },

    statLabel: {
      marginTop: 8,
      color: colors.textSecondary,
    },

    menu: {
      backgroundColor: colors.backgroundCard,
      margin: 20,
      borderRadius: 25,
      paddingVertical: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },

    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 18,
    },

    iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.backgroundMuted,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 18,
    },

    menuTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
  });
}
