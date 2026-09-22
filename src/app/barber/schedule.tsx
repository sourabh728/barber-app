import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchMyShopSchedule,
  getScheduleErrorMessage,
  updateMyShopSchedule,
} from "@/services/shop-schedule-api";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "20:00";
const DEFAULT_LUNCH_START = "13:00";
const DEFAULT_LUNCH_END = "14:00";

type TimeField = "openTime" | "closeTime" | "lunchStart" | "lunchEnd";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
function mondayFirstWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatRangeLabel(year: number, month: number) {
  const last = daysInMonth(year, month);
  return `${MONTH_SHORT[month]} 1 - ${MONTH_SHORT[month]} ${last}`;
}

function formatTime12h(hhmm: string) {
  const [hStr, mStr] = hhmm.split(":");
  let hour = Number(hStr);
  const minute = Number(mStr);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${pad2(hour)}:${pad2(minute)} ${period}`;
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      options.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

type CalendarCell = {
  key: string;
  day: number | null;
  dateKey: string | null;
};

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const totalDays = daysInMonth(year, month);
  const startOffset = mondayFirstWeekday(new Date(year, month, 1));
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ key: `pad-${i}`, day: null, dateKey: null });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = toDateKey(year, month, day);
    cells.push({ key: dateKey, day, dateKey });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `trail-${cells.length}`,
      day: null,
      dateKey: null,
    });
  }

  return cells;
}

export default function BarberScheduleScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [openTime, setOpenTime] = useState(DEFAULT_OPEN);
  const [closeTime, setCloseTime] = useState(DEFAULT_CLOSE);
  const [lunchStart, setLunchStart] = useState(DEFAULT_LUNCH_START);
  const [lunchEnd, setLunchEnd] = useState(DEFAULT_LUNCH_END);
  const [holidays, setHolidays] = useState<Set<string>>(() => new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activePicker, setActivePicker] = useState<TimeField | null>(null);

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const rangeLabel = useMemo(
    () => formatRangeLabel(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      try {
        const schedule = await fetchMyShopSchedule();
        if (cancelled) return;
        setOpenTime(schedule.openTime || DEFAULT_OPEN);
        setCloseTime(schedule.closeTime || DEFAULT_CLOSE);
        setLunchStart(schedule.lunchStart || DEFAULT_LUNCH_START);
        setLunchEnd(schedule.lunchEnd || DEFAULT_LUNCH_END);
        setHolidays(new Set(schedule.holidays));
        setErrorMessage("");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getScheduleErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      cancelled = true;
    };
  }, []);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const toggleHoliday = (dateKey: string) => {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const timeValue = (field: TimeField) => {
    switch (field) {
      case "openTime":
        return openTime;
      case "closeTime":
        return closeTime;
      case "lunchStart":
        return lunchStart;
      case "lunchEnd":
        return lunchEnd;
    }
  };

  const setTimeValue = (field: TimeField, value: string) => {
    switch (field) {
      case "openTime":
        setOpenTime(value);
        break;
      case "closeTime":
        setCloseTime(value);
        break;
      case "lunchStart":
        setLunchStart(value);
        break;
      case "lunchEnd":
        setLunchEnd(value);
        break;
    }
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleUpdate = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const updated = await updateMyShopSchedule({
        openTime,
        closeTime,
        lunchStart,
        lunchEnd,
        holidays: Array.from(holidays).sort(),
      });
      setOpenTime(updated.openTime);
      setCloseTime(updated.closeTime);
      setLunchStart(updated.lunchStart);
      setLunchEnd(updated.lunchEnd);
      setHolidays(new Set(updated.holidays));
      setSuccessMessage("Schedule updated.");
    } catch (error) {
      setErrorMessage(getScheduleErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const pickerTitle =
    activePicker === "openTime"
      ? "Opening Time"
      : activePicker === "closeTime"
        ? "Closing Time"
        : activePicker === "lunchStart"
          ? "Lunch Start"
          : activePicker === "lunchEnd"
            ? "Lunch End"
            : "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              disabled={isSaving}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heading}>Shop Schedule</Text>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : (
            <>
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => shiftMonth(-1)}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <Ionicons name="chevron-back" size={20} color="#C9C9D6" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{rangeLabel}</Text>
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => shiftMonth(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <Ionicons name="chevron-forward" size={20} color="#C9C9D6" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day) => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {cells.map((cell) => {
                  if (cell.day === null || !cell.dateKey) {
                    return <View key={cell.key} style={styles.dayCell} />;
                  }

                  const isHoliday = holidays.has(cell.dateKey);
                  return (
                    <TouchableOpacity
                      key={cell.key}
                      style={[
                        styles.dayCell,
                        styles.dayPressable,
                        isHoliday && styles.dayHoliday,
                      ]}
                      onPress={() => toggleHoliday(cell.dateKey!)}
                      accessibilityRole="button"
                      accessibilityLabel={`${cell.dateKey}, ${
                        isHoliday ? "Holiday" : "Working"
                      }. Tap to toggle.`}
                      accessibilityState={{ selected: isHoliday }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isHoliday && styles.dayTextHoliday,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendWorking]} />
                  <Text style={styles.legendText}>Working</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendHoliday]} />
                  <Text style={styles.legendText}>Holiday</Text>
                </View>
              </View>
              <Text style={styles.hint}>Tap a date to toggle Working / Holiday</Text>

              <Text style={styles.sectionTitle}>Default Timings</Text>
              <TimeRow
                label="Opening Time"
                value={formatTime12h(openTime)}
                onPress={() => setActivePicker("openTime")}
                disabled={isSaving}
              />
              <TimeRow
                label="Closing Time"
                value={formatTime12h(closeTime)}
                onPress={() => setActivePicker("closeTime")}
                disabled={isSaving}
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Lunch Break</Text>
              <TimeRow
                label="Lunch Start"
                value={formatTime12h(lunchStart)}
                onPress={() => setActivePicker("lunchStart")}
                disabled={isSaving}
              />
              <TimeRow
                label="Lunch End"
                value={formatTime12h(lunchEnd)}
                onPress={() => setActivePicker("lunchEnd")}
                disabled={isSaving}
              />

              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
              {successMessage ? (
                <Text style={styles.successText}>{successMessage}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.updateButton, isSaving && styles.buttonDisabled]}
                onPress={() => {
                  void handleUpdate();
                }}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving, busy: isSaving }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.updateButtonText}>UPDATE SCHEDULE</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>
      </ScrollView>

      <Modal
        visible={activePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActivePicker(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item}
              style={styles.timeList}
              initialScrollIndex={Math.max(
                0,
                TIME_OPTIONS.indexOf(
                  activePicker ? timeValue(activePicker) : DEFAULT_OPEN,
                ),
              )}
              getItemLayout={(_data, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
              renderItem={({ item }) => {
                const selected =
                  activePicker !== null && timeValue(activePicker) === item;
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, selected && styles.timeOptionSelected]}
                    onPress={() => {
                      if (activePicker) {
                        setTimeValue(activePicker, item);
                      }
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selected && styles.timeOptionTextSelected,
                      ]}
                    >
                      {formatTime12h(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TimeRow({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.timeRow}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeValueBox}>
        <Text style={styles.timeValue}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color="#8B8BA7" />
      </View>
    </TouchableOpacity>
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
    marginBottom: 8,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  loader: {
    marginTop: 48,
    marginBottom: 24,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 12,
  },

  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1A1A26",
    alignItems: "center",
    justifyContent: "center",
  },

  monthLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekday: {
    flex: 1,
    textAlign: "center",
    color: "#8B8BA7",
    fontSize: 13,
    fontWeight: "600",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },

  dayPressable: {
    borderRadius: 12,
    backgroundColor: "#1A1A26",
  },

  dayHoliday: {
    backgroundColor: "#7F1D1D",
  },

  dayText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },

  dayTextHoliday: {
    color: "#FECACA",
  },

  legendRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 14,
    justifyContent: "center",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendWorking: {
    backgroundColor: "#1A1A26",
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },

  legendHoliday: {
    backgroundColor: "#DC2626",
  },

  legendText: {
    color: "#C9C9D6",
    fontSize: 13,
  },

  hint: {
    color: "#8B8BA7",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },

  sectionTitle: {
    color: "#F97316",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },

  timeLabel: {
    color: "#C9C9D6",
    fontSize: 15,
    flex: 1,
  },

  timeValueBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A1A26",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 130,
    justifyContent: "space-between",
  },

  timeValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#2A2A3A",
    marginTop: 8,
  },

  errorText: {
    color: "#F87171",
    marginTop: 16,
    fontSize: 14,
  },

  successText: {
    color: "#4ADE80",
    marginTop: 16,
    fontSize: 14,
  },

  updateButton: {
    marginTop: 24,
    backgroundColor: "#F97316",
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  updateButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#12121C",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: "60%",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  timeList: {
    maxHeight: 280,
  },

  timeOption: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  timeOptionSelected: {
    backgroundColor: "#1A1A26",
  },

  timeOptionText: {
    color: "#C9C9D6",
    fontSize: 16,
  },

  timeOptionTextSelected: {
    color: "#F97316",
    fontWeight: "700",
  },

  modalClose: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },

  modalCloseText: {
    color: "#8B8BA7",
    fontSize: 15,
    fontWeight: "600",
  },
});
