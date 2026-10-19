import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";
import {
  fetchAdminOverview,
  fetchAdminSettings,
  getAdminErrorMessage,
  updateAdminSettings,
  type AdminOverview,
  type AdminSettings,
} from "@/services/admin-api";
import type { PaymentMode } from "@/services/public-settings-api";
import { showAppAlert } from "@/utils/app-alert";

type TabId = "overview" | "payments" | "maintenance";

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneColor =
    tone === "good"
      ? "#15803D"
      : tone === "warn"
        ? "#B45309"
        : tone === "bad"
          ? "#B91C1C"
          : "#0F172A";

  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: toneColor }]}>{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { user, signOut } = useSession();
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [shopQuery, setShopQuery] = useState("");

  // Editable fields
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceUntil, setMaintenanceUntil] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("PAY_AT_SHOP");
  const [bookingFeeInr, setBookingFeeInr] = useState("11");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutUpiId, setPayoutUpiId] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
  const [payoutIfsc, setPayoutIfsc] = useState("");

  const applySettings = useCallback((s: AdminSettings) => {
    setSettings(s);
    setMaintenanceEnabled(s.maintenanceEnabled);
    setMaintenanceMessage(s.maintenanceMessage);
    setMaintenanceUntil(
      s.maintenanceUntil
        ? new Date(s.maintenanceUntil).toISOString().slice(0, 16)
        : "",
    );
    setPaymentMode(s.paymentMode);
    setBookingFeeInr(String(s.bookingFeeInr));
    setPayoutAccountName(s.payoutAccountName ?? "");
    setPayoutUpiId(s.payoutUpiId ?? "");
    setPayoutBankName(s.payoutBankName ?? "");
    setPayoutAccountNumber(s.payoutAccountNumber ?? "");
    setPayoutIfsc(s.payoutIfsc ?? "");
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const [ov, st] = await Promise.all([
          fetchAdminOverview(),
          fetchAdminSettings(),
        ]);
        setOverview(ov);
        applySettings(st);
      } catch (err) {
        setError(getAdminErrorMessage(err, "Could not load admin dashboard."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applySettings],
  );

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load]),
  );

  const filteredShops = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    if (!overview) return [];
    if (!q) return overview.shopList;
    return overview.shopList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.ownerEmail.toLowerCase().includes(q),
    );
  }, [overview, shopQuery]);

  async function saveMaintenance() {
    setSaving(true);
    try {
      const updated = await updateAdminSettings({
        maintenanceEnabled,
        maintenanceMessage: maintenanceMessage.trim(),
        maintenanceUntil: maintenanceUntil
          ? new Date(maintenanceUntil).toISOString()
          : null,
      });
      applySettings(updated);
      showAppAlert(
        "Saved",
        maintenanceEnabled
          ? "Maintenance mode is on. Customers and barbers will see your message."
          : "Maintenance mode is off. The app is live.",
      );
    } catch (err) {
      showAppAlert("Error", getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function savePayments() {
    const fee = Number(bookingFeeInr);
    if (
      paymentMode === "ONLINE_FEE_REST_AT_SHOP" &&
      (!Number.isFinite(fee) || fee < 1)
    ) {
      showAppAlert("Invalid fee", "Enter a booking fee of at least ₹1.");
      return;
    }
    if (
      paymentMode === "ONLINE_FEE_REST_AT_SHOP" &&
      !payoutUpiId.trim() &&
      !payoutAccountNumber.trim()
    ) {
      showAppAlert(
        "Payout account needed",
        "Add a UPI ID or bank account so customers know where to pay.",
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminSettings({
        paymentMode,
        bookingFeeInr: Number.isFinite(fee) ? Math.round(fee) : 11,
        payoutAccountName: payoutAccountName.trim() || null,
        payoutUpiId: payoutUpiId.trim() || null,
        payoutBankName: payoutBankName.trim() || null,
        payoutAccountNumber: payoutAccountNumber.trim() || null,
        payoutIfsc: payoutIfsc.trim() || null,
      });
      applySettings(updated);
      showAppAlert("Saved", "Payment settings updated for all bookings.");
    } catch (err) {
      showAppAlert("Error", getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !overview) {
    return (
      <SafeAreaView style={styles.centered} edges={["top", "bottom"]}>
        <ActivityIndicator color="#0B5A47" size="large" />
        <Text style={styles.muted}>Loading platform overview…</Text>
      </SafeAreaView>
    );
  }

  const by = overview?.bookings.byStatus ?? {};

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>Trimshim Admin</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => void load("refresh")}
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh" size={20} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => void signOut()}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ["overview", "Overview"],
            ["payments", "Payments"],
            ["maintenance", "Maintenance"],
          ] as const
        ).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id ? styles.tabActive : null]}
            onPress={() => setTab(id)}
          >
            <Text
              style={[styles.tabText, tab === id ? styles.tabTextActive : null]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor="#0B5A47"
          />
        }
      >
        {tab === "overview" && overview ? (
          <>
            <Text style={styles.sectionTitle}>Platform pulse</Text>
            <View style={styles.statGrid}>
              <StatCard label="Shops" value={overview.shops} />
              <StatCard label="Bookings" value={overview.bookings.total} />
              <StatCard label="Customers" value={overview.customers} />
              <StatCard label="Barbers" value={overview.barbers} />
            </View>

            <Text style={styles.sectionTitle}>Booking status</Text>
            <View style={styles.statGrid}>
              <StatCard
                label="Confirmed"
                value={by.CONFIRMED ?? 0}
                tone="good"
              />
              <StatCard
                label="Pending"
                value={by.PENDING ?? 0}
                tone="warn"
              />
              <StatCard
                label="Rejected"
                value={by.REJECTED ?? 0}
                tone="bad"
              />
              <StatCard label="Completed" value={by.COMPLETED ?? 0} />
              <StatCard label="In progress" value={by.IN_PROGRESS ?? 0} />
              <StatCard label="Cancelled" value={by.CANCELLED ?? 0} />
            </View>

            <Text style={styles.sectionTitle}>Points across the network</Text>
            <View style={styles.statGrid}>
              <StatCard
                label="Total points"
                value={overview.points.totalPoints}
              />
              <StatCard
                label="Avg score"
                value={overview.points.averageBookingScore}
              />
              <StatCard
                label="Punctuality avg"
                value={overview.points.averagePunctuality}
              />
              <StatCard
                label="Scored bookings"
                value={overview.points.scoredBookings}
              />
            </View>

            <Text style={styles.sectionTitle}>Shops</Text>
            <TextInput
              style={styles.input}
              placeholder="Search shops, city, owner…"
              placeholderTextColor="#94A3B8"
              value={shopQuery}
              onChangeText={setShopQuery}
            />
            {filteredShops.length === 0 ? (
              <Text style={styles.muted}>No shops match.</Text>
            ) : (
              filteredShops.map((shop) => (
                <View key={shop.id} style={styles.shopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <Text style={styles.shopMeta}>
                      {[shop.city, shop.state].filter(Boolean).join(", ") ||
                        "Location n/a"}
                    </Text>
                    <Text style={styles.shopMeta}>
                      {shop.ownerName} · {shop.ownerEmail}
                    </Text>
                  </View>
                  <View style={styles.shopStats}>
                    <Text style={styles.shopStatNum}>{shop.bookings}</Text>
                    <Text style={styles.shopStatLabel}>bookings</Text>
                    <Text style={styles.shopStatNum}>{shop.staff}</Text>
                    <Text style={styles.shopStatLabel}>staff</Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Recent activity</Text>
            {overview.recentActivity.length === 0 ? (
              <Text style={styles.muted}>No bookings yet.</Text>
            ) : (
              overview.recentActivity.map((item) => (
                <View key={item.id} style={styles.activityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>
                      {item.customerName} · {item.serviceName}
                    </Text>
                    <Text style={styles.shopMeta}>
                      {item.shopName} · {item.date} {item.startTime}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </View>
                  {item.bookingScore != null ? (
                    <Text style={styles.scorePill}>{item.bookingScore} pts</Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === "payments" && settings ? (
          <>
            <Text style={styles.sectionTitle}>Payment mode for all bookings</Text>
            <Text style={styles.help}>
              Changes apply platform-wide. Customers see the selected option on
              booking review and history.
            </Text>

            {(
              [
                ["PAY_AT_SHOP", "Pay at shop", "Full amount collected at the shop."],
                [
                  "ONLINE_FEE_REST_AT_SHOP",
                  "₹11 online + rest at shop",
                  "Small booking fee online; balance after service.",
                ],
              ] as const
            ).map(([mode, title, desc]) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.choice,
                  paymentMode === mode ? styles.choiceActive : null,
                ]}
                onPress={() => setPaymentMode(mode)}
              >
                <Ionicons
                  name={
                    paymentMode === mode
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color="#0B5A47"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>{title}</Text>
                  <Text style={styles.choiceDesc}>{desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {paymentMode === "ONLINE_FEE_REST_AT_SHOP" ? (
              <>
                <Text style={styles.label}>Online booking fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={bookingFeeInr}
                  onChangeText={setBookingFeeInr}
                />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Receive money in your account</Text>
            <Text style={styles.help}>
              Shown to customers when online fee mode is active. You can change
              the account anytime.
            </Text>

            <Text style={styles.label}>Account holder name</Text>
            <TextInput
              style={styles.input}
              value={payoutAccountName}
              onChangeText={setPayoutAccountName}
              placeholder="Name on account"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>UPI ID</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={payoutUpiId}
              onChangeText={setPayoutUpiId}
              placeholder="name@upi"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>Bank name</Text>
            <TextInput
              style={styles.input}
              value={payoutBankName}
              onChangeText={setPayoutBankName}
              placeholder="Bank name"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>Account number</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={payoutAccountNumber}
              onChangeText={setPayoutAccountNumber}
              placeholder="Account number"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>IFSC</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="characters"
              value={payoutIfsc}
              onChangeText={setPayoutIfsc}
              placeholder="IFSC"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              disabled={saving}
              onPress={() => void savePayments()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save payment settings</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}

        {tab === "maintenance" && settings ? (
          <>
            <Text style={styles.sectionTitle}>App maintenance</Text>
            <Text style={styles.help}>
              When on, customers and barbers see a full-screen message and API
              access is paused. You stay signed in as admin.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Maintenance mode</Text>
              <Switch
                value={maintenanceEnabled}
                onValueChange={setMaintenanceEnabled}
                trackColor={{ true: "#0B5A47", false: "#CBD5E1" }}
              />
            </View>

            <Text style={styles.label}>Custom message</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={maintenanceMessage}
              onChangeText={setMaintenanceMessage}
              placeholder="We’ll be back soon…"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Back online at (optional)</Text>
            <TextInput
              style={styles.input}
              value={maintenanceUntil}
              onChangeText={setMaintenanceUntil}
              placeholder="YYYY-MM-DDTHH:mm"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Text style={styles.help}>
              Use local ISO-like time, e.g. 2026-10-20T18:30. Leave blank for
              indefinite.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.btnDisabled]}
              disabled={saving}
              onPress={() => void saveMaintenance()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save maintenance</Text>
              )}
            </TouchableOpacity>

            {settings.maintenanceEnabled ? (
              <View style={styles.liveBanner}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <Text style={styles.liveBannerText}>
                  Maintenance is currently ON for non-admin users.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF6F1",
  },
  centered: {
    flex: 1,
    backgroundColor: "#EAF6F1",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  headerCopy: {
    flex: 1,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B5A47",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1E7DD",
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#D1E7DD",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#0B5A47",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  help: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    marginBottom: 4,
  },
  muted: {
    fontSize: 13,
    color: "#64748B",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1E7DD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  shopRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  shopName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  shopMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  shopStats: {
    alignItems: "flex-end",
    minWidth: 64,
  },
  shopStatNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B5A47",
  },
  shopStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  badge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B5A47",
  },
  scorePill: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  choice: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  choiceActive: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDFA",
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  choiceDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1E7DD",
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#0B5A47",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  liveBanner: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
  },
  liveBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
  },
});
