import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/services/notifications-api";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications();
      setItems(data);
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleOpen(item: AppNotification) {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? { ...row, isRead: true, readAt: new Date().toISOString() }
              : row,
          ),
        );
      } catch {
        // Still navigate even if mark-read fails.
      }
    }

    if (item.href) {
      router.push(item.href as never);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((row) => ({
          ...row,
          isRead: true,
          readAt: row.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      setError("Could not mark notifications as read.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heading}>Notifications</Text>
            <TouchableOpacity
              onPress={() => {
                void handleMarkAllRead();
              }}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={styles.markAll}>Read all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loading && items.length === 0 ? (
            <Text style={styles.emptyText}>No notifications yet.</Text>
          ) : null}

          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.item, !item.isRead && styles.itemUnread]}
              onPress={() => {
                void handleOpen(item);
              }}
              accessibilityRole="button"
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {!item.isRead ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.itemBody}>{item.body}</Text>
              <Text style={styles.itemWhen}>{formatWhen(item.createdAt)}</Text>
            </TouchableOpacity>
          ))}
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
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#232336",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  markAll: {
    color: "#F6A623",
    fontWeight: "700",
    fontSize: 13,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    color: "#F87171",
    marginBottom: 12,
  },
  emptyText: {
    color: "#8B8BA7",
    textAlign: "center",
    marginVertical: 28,
    fontSize: 15,
  },
  item: {
    backgroundColor: "#1A1A28",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2A3A",
  },
  itemUnread: {
    borderColor: "#F6A623",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F6A623",
  },
  itemBody: {
    color: "#C9C9D6",
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  itemWhen: {
    color: "#8B8BA7",
    marginTop: 8,
    fontSize: 12,
  },
});
