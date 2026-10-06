import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMyShopService,
  deleteMyShopService,
  fetchMyShopServices,
  getShopServiceErrorMessage,
  updateMyShopService,
  type ShopServiceItem,
} from "@/services/shop-services-api";

type ServiceForm = {
  name: string;
  priceInr: string;
  durationMin: string;
};

const emptyForm: ServiceForm = {
  name: "",
  priceInr: "",
  durationMin: "30",
};

export default function BarberServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<ShopServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShopServiceItem | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setServices(await fetchMyShopServices());
    } catch (err) {
      setError(getShopServiceErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (service: ShopServiceItem) => {
    setEditing(service);
    setForm({
      name: service.name,
      priceInr: String(service.priceInr),
      durationMin: String(service.durationMin),
    });
    setFormError("");
    setModalOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const price = Number(form.priceInr);
    const duration = Number(form.durationMin || "30");
    if (!name) {
      setFormError("Enter a service name.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price.");
      return;
    }
    if (!Number.isFinite(duration) || duration < 5) {
      setFormError("Duration must be at least 5 minutes.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        const updated = await updateMyShopService(editing.id, {
          name,
          priceInr: Math.round(price),
          durationMin: Math.round(duration),
        });
        setServices((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createMyShopService({
          name,
          priceInr: Math.round(price),
          durationMin: Math.round(duration),
        });
        setServices((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getShopServiceErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = (service: ShopServiceItem) => {
    Alert.alert("Delete service", `Remove ${service.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteMyShopService(service.id);
              setServices((prev) => prev.filter((item) => item.id !== service.id));
            } catch (err) {
              setError(getShopServiceErrorMessage(err));
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Shop Services</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.hint}>
          These services appear when you add a walk-in from Home (long-press a
          free slot).
        </Text>

        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add service</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#0B5A47" style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : services.length === 0 ? (
          <Text style={styles.empty}>No services yet. Add your menu above.</Text>
        ) : (
          services.map((service) => (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardMeta}>
                  ₹{service.priceInr} · {service.durationMin} min
                </Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(service)}>
                <Ionicons name="create-outline" size={20} color="#0B5A47" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(service)}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {editing ? "Edit service" : "New service"}
            </Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              placeholder="Haircut"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.priceInr}
              onChangeText={(priceInr) => setForm((f) => ({ ...f, priceInr }))}
              keyboardType="number-pad"
              placeholder="199"
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={form.durationMin}
              onChangeText={(durationMin) =>
                setForm((f) => ({ ...f, durationMin }))
              }
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor="#94A3B8"
            />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              disabled={saving}
              onPress={() => void save()}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSpacer: { width: 40 },
  hint: { color: "#64748B", fontSize: 13, marginBottom: 14, lineHeight: 18 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "800" },
  empty: { color: "#64748B", marginTop: 12 },
  error: { color: "#B91C1C", marginTop: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontWeight: "800", color: "#0F172A", fontSize: 15 },
  cardMeta: { color: "#64748B", marginTop: 2, fontWeight: "600" },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: "#0B5A47",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#FFFFFF", fontWeight: "800" },
});
