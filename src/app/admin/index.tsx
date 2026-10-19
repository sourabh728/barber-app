import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
  fetchAdminBookingsReport,
  fetchAdminOverview,
  fetchAdminSettings,
  getAdminErrorMessage,
  updateAdminSettings,
  type AdminBookingsReport,
  type AdminOverview,
  type AdminSettings,
} from "@/services/admin-api";
import type { PaymentMode } from "@/services/public-settings-api";
import { showAppAlert } from "@/utils/app-alert";

type TabId = "report" | "shops" | "points" | "payments" | "takedown";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoKey(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

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
  const router = useRouter();
  const { user, signOut } = useSession();
  const [tab, setTab] = useState<TabId>("report");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [report, setReport] = useState<AdminBookingsReport | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoKey(7));
  const [toDate, setToDate] = useState(todayKey());

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

  const loadReport = useCallback(async (from: string, to: string) => {
    setReportLoading(true);
    try {
      const data = await fetchAdminBookingsReport(from.trim(), to.trim());
      setReport(data);
    } catch (err) {
      showAppAlert("Report error", getAdminErrorMessage(err));
    } finally {
      setReportLoading(false);
    }
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
        await loadReport(fromDate, toDate);
      } catch (err) {
        setError(getAdminErrorMessage(err, "Could not load admin dashboard."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applySettings, fromDate, toDate, loadReport],
  );

  useFocusEffect(
    useCallback(() => {
      void load("initial");
      // Intentionally only on focus — date changes use Run report.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
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
    if (maintenanceEnabled && !maintenanceMessage.trim()) {
      showAppAlert(
        "Reason required",
        "Enter a reason / message customers will see while the app is down.",
      );
      return;
    }
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
          ? "App is down for maintenance. Users will see your reason."
          : "App is live again.",
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
        <Text style={styles.muted}>Loading admin dashboard…</Text>
      </SafeAreaView>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "report", label: "Report" },
    { id: "shops", label: "Shops" },
    { id: "points", label: "Points" },
    { id: "payments", label: "Pay" },
    { id: "takedown", label: "Down" },
  ];

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
          onPress={() => {
            void (async () => {
              await signOut();
              router.replace("/auth");
            })();
          }}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map(({ id, label }) => (
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
      </ScrollView>

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
        {tab === "report" ? (
          <>
            <Text style={styles.sectionTitle}>Date-wise booking report</Text>
            <Text style={styles.help}>
              Pick a from / to date (YYYY-MM-DD) to see shop-wise bookings and
              payment totals.
            </Text>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.label}>From</Text>
                <TextInput
                  style={styles.input}
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.label}>To</Text>
                <TextInput
                  style={styles.input}
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.presetRow}>
              {(
                [
                  ["7d", 7],
                  ["30d", 30],
                  ["Today", 0],
                ] as const
              ).map(([label, days]) => (
                <TouchableOpacity
                  key={label}
                  style={styles.presetChip}
                  onPress={() => {
                    const to = todayKey();
                    const from = days === 0 ? to : daysAgoKey(days);
                    setFromDate(from);
                    setToDate(to);
                    void loadReport(from, to);
                  }}
                >
                  <Text style={styles.presetChipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, reportLoading && styles.btnDisabled]}
              disabled={reportLoading}
              onPress={() => void loadReport(fromDate, toDate)}
            >
              {reportLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Run report</Text>
              )}
            </TouchableOpacity>

            {report ? (
              <>
                <Text style={styles.sectionTitle}>
                  {report.from} → {report.to}
                </Text>
                <View style={styles.statGrid}>
                  <StatCard label="Bookings" value={report.totals.bookings} />
                  <StatCard
                    label="Shops active"
                    value={report.totals.shopsWithBookings}
                  />
                  <StatCard
                    label="Payment total"
                    value={formatInr(report.totals.paymentTotalInr)}
                    tone="good"
                  />
                  <StatCard
                    label="Online fees (est.)"
                    value={formatInr(report.totals.estimatedOnlineFeesInr)}
                  />
                  <StatCard label="Points" value={report.totals.points} />
                  <StatCard
                    label="Confirmed"
                    value={report.totals.byStatus.CONFIRMED ?? 0}
                    tone="good"
                  />
                  <StatCard
                    label="Rejected"
                    value={report.totals.byStatus.REJECTED ?? 0}
                    tone="bad"
                  />
                  <StatCard
                    label="Pending"
                    value={report.totals.byStatus.PENDING ?? 0}
                    tone="warn"
                  />
                </View>
                <Text style={styles.help}>
                  Payment mode:{" "}
                  {report.paymentMode === "ONLINE_FEE_REST_AT_SHOP"
                    ? `₹${report.bookingFeeInr} online + rest at shop`
                    : "Pay at shop"}
                </Text>

                <Text style={styles.sectionTitle}>By shop</Text>
                {report.shops.length === 0 ? (
                  <Text style={styles.muted}>No bookings in this range.</Text>
                ) : (
                  report.shops.map((shop) => (
                    <View key={shop.shopId} style={styles.shopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shopName}>{shop.shopName}</Text>
                        <Text style={styles.shopMeta}>
                          {[shop.city, shop.state].filter(Boolean).join(", ") ||
                            "—"}
                        </Text>
                        <Text style={styles.shopMeta}>
                          Confirmed {shop.byStatus.CONFIRMED ?? 0} · Rejected{" "}
                          {shop.byStatus.REJECTED ?? 0} · Pending{" "}
                          {shop.byStatus.PENDING ?? 0} · Done{" "}
                          {shop.byStatus.COMPLETED ?? 0}
                        </Text>
                      </View>
                      <View style={styles.shopStats}>
                        <Text style={styles.shopStatNum}>{shop.bookings}</Text>
                        <Text style={styles.shopStatLabel}>bookings</Text>
                        <Text style={styles.shopStatNum}>
                          {formatInr(shop.paymentTotalInr)}
                        </Text>
                        <Text style={styles.shopStatLabel}>payment</Text>
                        <Text style={styles.shopStatNum}>{shop.points}</Text>
                        <Text style={styles.shopStatLabel}>points</Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}
          </>
        ) : null}

        {tab === "shops" && overview ? (
          <>
            <Text style={styles.sectionTitle}>All listed shops</Text>
            <View style={styles.statGrid}>
              <StatCard label="Shops" value={overview.shops} />
              <StatCard label="Customers" value={overview.customers} />
              <StatCard label="Barbers" value={overview.barbers} />
              <StatCard label="Bookings" value={overview.bookings.total} />
            </View>
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
                    {shop.address ? (
                      <Text style={styles.shopMeta}>{shop.address}</Text>
                    ) : null}
                    <Text style={styles.shopMeta}>
                      {shop.ownerName} · {shop.ownerEmail}
                    </Text>
                  </View>
                  <View style={styles.shopStats}>
                    <Text style={styles.shopStatNum}>{shop.bookings}</Text>
                    <Text style={styles.shopStatLabel}>bookings</Text>
                    <Text style={styles.shopStatNum}>{shop.staff}</Text>
                    <Text style={styles.shopStatLabel}>staff</Text>
                    <Text style={styles.shopStatNum}>{shop.totalPoints}</Text>
                    <Text style={styles.shopStatLabel}>points</Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === "points" && overview ? (
          <>
            <Text style={styles.sectionTitle}>Network points</Text>
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

            <Text style={styles.sectionTitle}>Shop points leaderboard</Text>
            {overview.shopPointsLeaderboard.length === 0 ? (
              <Text style={styles.muted}>No scored bookings yet.</Text>
            ) : (
              overview.shopPointsLeaderboard.map((row) => (
                <View key={row.id} style={styles.shopRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{row.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{row.name}</Text>
                    <Text style={styles.shopMeta}>
                      {row.city || "—"} · {row.scoredBookings} scored ·{" "}
                      {row.bookings} total bookings
                    </Text>
                  </View>
                  <Text style={styles.pointsBig}>{row.totalPoints}</Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === "payments" && settings ? (
          <>
            <Text style={styles.sectionTitle}>
              Payment mode for all bookings
            </Text>
            <Text style={styles.help}>
              Changes apply platform-wide. Customers see this on booking review
              and history.
            </Text>

            {(
              [
                [
                  "PAY_AT_SHOP",
                  "Pay at shop",
                  "Full amount collected at the shop.",
                ],
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

            <Text style={styles.sectionTitle}>Receive money account</Text>
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

        {tab === "takedown" && settings ? (
          <>
            <Text style={styles.sectionTitle}>Take the app down</Text>
            <Text style={styles.help}>
              When on, customers and barbers see a full-screen screen with your
              reason. You stay signed in as admin.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>App under maintenance</Text>
              <Switch
                value={maintenanceEnabled}
                onValueChange={setMaintenanceEnabled}
                trackColor={{ true: "#B91C1C", false: "#CBD5E1" }}
              />
            </View>

            <Text style={styles.label}>Reason / message (shown to users)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={maintenanceMessage}
              onChangeText={setMaintenanceMessage}
              placeholder="We’ll be back soon — upgrading servers…"
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

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                maintenanceEnabled ? styles.dangerBtn : null,
                saving && styles.btnDisabled,
              ]}
              disabled={saving}
              onPress={() => void saveMaintenance()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {maintenanceEnabled
                    ? "Take app down now"
                    : "Save — keep app live"}
                </Text>
              )}
            </TouchableOpacity>

            {settings.maintenanceEnabled ? (
              <View style={styles.liveBanner}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <Text style={styles.liveBannerText}>
                  App is currently DOWN for non-admin users.
                </Text>
              </View>
            ) : (
              <View style={[styles.liveBanner, styles.liveOk]}>
                <Ionicons name="checkmark-circle" size={18} color="#166534" />
                <Text style={[styles.liveBannerText, styles.liveOkText]}>
                  App is live for customers and barbers.
                </Text>
              </View>
            )}
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
  tabsScroll: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D1E7DD",
  },
  tabActive: {
    backgroundColor: "#0B5A47",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 4,
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
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1E7DD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B5A47",
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
    fontSize: 20,
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
    alignItems: "center",
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
    minWidth: 72,
  },
  shopStatNum: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0B5A47",
  },
  shopStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B5A47",
  },
  pointsBig: {
    fontSize: 20,
    fontWeight: "800",
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
    marginTop: 12,
    backgroundColor: "#0B5A47",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtn: {
    backgroundColor: "#B91C1C",
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
  liveOk: {
    backgroundColor: "#DCFCE7",
  },
  liveOkText: {
    color: "#166534",
  },
});
