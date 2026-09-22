import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchMyShopDailyReport,
  getDailyReportErrorMessage,
  type DailyReport,
} from "@/services/shop-reports-api";

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

function addDays(dateKey: string, delta: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

function formatDateLabel(dateKey: string) {
  const todayKey = toDateKey(new Date());
  const date = parseDateKey(dateKey);
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (dateKey === todayKey) {
    return `Today, ${formatted}`;
  }
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday}, ${formatted}`;
}

function formatInr(amount: number) {
  return `₹ ${amount.toLocaleString("en-IN")}`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function DailyReportScreen() {
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = useCallback(async (dateKey: string) => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const data = await fetchMyShopDailyReport({ date: dateKey });
      setReport(data);
    } catch (error) {
      setReport(null);
      setErrorMessage(getDailyReportErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOnChange() {
      setErrorMessage("");
      setIsLoading(true);

      try {
        const data = await fetchMyShopDailyReport({ date: selectedDate });
        if (!cancelled) {
          setReport(data);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(null);
          setErrorMessage(getDailyReportErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOnChange();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const overview = report?.overview;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#14141F", "#0C0C14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <Text style={styles.heading}>Daily Report</Text>
            <View style={styles.calendarBadge} accessibilityLabel="Calendar">
              <Ionicons name="calendar-outline" size={20} color="#F97316" />
            </View>
          </View>

          <View style={styles.dateNav}>
            <TouchableOpacity
              style={styles.dateNavBtn}
              onPress={() => setSelectedDate((prev) => addDays(prev, -1))}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.dateNavLabel}>
              {formatDateLabel(selectedDate)}
            </Text>
            <TouchableOpacity
              style={styles.dateNavBtn}
              onPress={() => setSelectedDate((prev) => addDays(prev, 1))}
              accessibilityRole="button"
              accessibilityLabel="Next day"
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  void loadReport(selectedDate);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Shop Overview</Text>

              <View style={styles.overviewBlock}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>
                    Total Collection (Earnings)
                  </Text>
                  <Text style={styles.metricValueHighlight}>
                    {formatInr(overview?.totalCollectionInr ?? 0)}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Appointments</Text>
                  <Text style={styles.metricValue}>
                    {overview?.totalAppointments ?? 0}
                  </Text>
                </View>

                <View style={[styles.metricRow, styles.metricRowLast]}>
                  <Text style={styles.metricLabel}>
                    Total Services Completed
                  </Text>
                  <Text style={styles.metricValue}>
                    {overview?.totalServicesCompleted ?? 0}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Performance by Barber</Text>

              {!report?.byBarber.length ? (
                <Text style={styles.emptyText}>
                  No appointment activity for this date.
                </Text>
              ) : (
                report.byBarber.map((row, index) => (
                  <View
                    key={row.staffId ?? `any-${index}`}
                    style={[
                      styles.barberRow,
                      index === report.byBarber.length - 1 &&
                        styles.barberRowLast,
                    ]}
                  >
                    <View style={styles.barberHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {initialsFromName(row.staffName)}
                        </Text>
                      </View>
                      <Text style={styles.barberName}>{row.staffName}</Text>
                    </View>
                    <Text style={styles.barberMeta}>
                      Appointments: {row.appointments}
                      {"  |  "}
                      Services: {row.servicesCompleted}
                    </Text>
                    <Text style={styles.barberRevenue}>
                      Revenue Generated: {formatInr(row.revenueInr)}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090F",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerSpacer: {
    width: 40,
  },

  calendarBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(249,115,22,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
  },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },

  dateNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
  },

  dateNavLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#8B8BA7",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  overviewBlock: {
    marginBottom: 28,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  metricRowLast: {
    marginBottom: 8,
  },

  metricLabel: {
    color: "#C9C9D6",
    fontSize: 15,
    flex: 1,
    paddingRight: 8,
  },

  metricValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  metricValueHighlight: {
    color: "#F97316",
    fontSize: 18,
    fontWeight: "800",
  },

  barberRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  barberRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },

  barberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#F97316",
    fontSize: 13,
    fontWeight: "700",
  },

  barberName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },

  barberMeta: {
    color: "#8B8BA7",
    fontSize: 13,
    marginBottom: 4,
    paddingLeft: 52,
  },

  barberRevenue: {
    color: "#C9C9D6",
    fontSize: 14,
    fontWeight: "600",
    paddingLeft: 52,
  },

  loader: {
    marginTop: 32,
    marginBottom: 16,
  },

  emptyText: {
    color: "#8B8BA7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },

  errorBox: {
    marginTop: 8,
  },

  errorText: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 8,
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
