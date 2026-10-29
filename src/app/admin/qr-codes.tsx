import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createAdminQrCode,
  deleteAdminQrCode,
  fetchAdminQrCodes,
  getAdminErrorMessage,
  type AdminQrCode,
} from "@/services/admin-api";
import { showAppAlert } from "@/utils/app-alert";

type QrRef = { toDataURL: (cb: (data: string) => void) => void };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(items: { name: string; image: string }[]) {
  const pages = items
    .map(
      ({ name, image }) => `
      <div class="page">
        <div class="brand">Trimshim</div>
        <img src="data:image/png;base64,${image}" />
        <div class="name">${escapeHtml(name)}</div>
        <div class="hint">Scan to register / check in</div>
      </div>`,
    )
    .join("");

  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; margin: 0; }
    .page { page-break-after: always; text-align: center; padding: 60px 20px; }
    .brand { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
    img { width: 340px; height: 340px; }
    .name { font-size: 32px; font-weight: 700; margin-top: 24px; }
    .hint { font-size: 16px; color: #555; margin-top: 8px; }
  </style></head><body>${pages}</body></html>`;
}

export default function AdminQrCodesScreen() {
  const router = useRouter();
  const [codes, setCodes] = useState<AdminQrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const refs = useRef<Record<string, QrRef | null>>({});


  useEffect(() => {
    let cancelled = false;
    fetchAdminQrCodes()
      .then((data) => {
        if (!cancelled) setCodes(data);
      })
      .catch((err) => {
        if (!cancelled) showAppAlert("QR codes", getAdminErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      showAppAlert("Name required", "Enter a name for this QR code.");
      return;
    }
    setCreating(true);
    try {
      const created = await createAdminQrCode(trimmed);
      setCodes((prev) => [created, ...prev]);
      setName("");
    } catch (err) {
      showAppAlert("Could not generate", getAdminErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(code: AdminQrCode) {
    try {
      await deleteAdminQrCode(code.id);
      setCodes((prev) => prev.filter((c) => c.id !== code.id));
    } catch (err) {
      showAppAlert("Could not delete", getAdminErrorMessage(err));
    }
  }

  function toImage(code: AdminQrCode) {
    return new Promise<string>((resolve, reject) => {
      const ref = refs.current[code.id];
      if (!ref) {
        reject(new Error("QR is not ready yet."));
        return;
      }
      ref.toDataURL((data) => resolve(data));
    });
  }

  async function handlePrint(targets: AdminQrCode[]) {
    if (targets.length === 0) {
      return;
    }
    setPrinting(true);
    try {
      const items = await Promise.all(
        targets.map(async (c) => ({ name: c.name, image: await toImage(c) })),
      );
      await Print.printAsync({ html: buildPrintHtml(items) });
    } catch (err) {
      showAppAlert("Print failed", getAdminErrorMessage(err));
    } finally {
      setPrinting(false);
    }
  }

  const query = search.trim().toLowerCase();
  const visible = query
    ? codes.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.shopName ?? "").toLowerCase().includes(query),
      )
    : codes;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Shop QR codes</Text>
        <TouchableOpacity
          onPress={() => void handlePrint(visible)}
          disabled={printing || visible.length === 0}
          hitSlop={12}
          accessibilityLabel="Print all"
        >
          <Ionicons name="print-outline" size={24} color="#0B5A47" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Generate a QR for a barber at onboarding. The barber scans it while
          registering their shop; customers then scan the same code to check in.
        </Text>

        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Raju Hair Salon)"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            maxLength={80}
            editable={!creating}
            onSubmitEditing={() => void handleCreate()}
          />
          <TouchableOpacity
            style={[styles.generateBtn, creating && styles.disabled]}
            onPress={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateText}>Generate</Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Search by name or shop"
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator color="#0B5A47" style={{ marginTop: 24 }} />
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>No QR codes yet.</Text>
        ) : (
          visible.map((code) => (
            <View key={code.id} style={styles.card}>
              <QRCode
                value={code.qrPayload}
                size={160}
                backgroundColor="#fff"
                getRef={(c) => {
                  refs.current[code.id] = c as unknown as QrRef | null;
                }}
              />
              <Text style={styles.cardName}>{code.name}</Text>
              <Text style={code.claimed ? styles.linked : styles.unused}>
                {code.claimed
                  ? `Linked to shop: ${code.shopName ?? "—"}`
                  : "Not used yet"}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, printing && styles.disabled]}
                  onPress={() => void handlePrint([code])}
                  disabled={printing}
                >
                  <Ionicons name="print-outline" size={18} color="#0B5A47" />
                  <Text style={styles.actionText}>Print</Text>
                </TouchableOpacity>
                {!code.claimed ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => void handleDelete(code)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#B91C1C" />
                    <Text style={[styles.actionText, { color: "#B91C1C" }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20, gap: 12 },
  hint: { color: "#475569", fontSize: 13, lineHeight: 19 },
  createRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
  },
  generateBtn: {
    backgroundColor: "#0B5A47",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: "center",
  },
  generateText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  empty: { textAlign: "center", color: "#64748B", marginTop: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardName: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 8 },
  linked: { color: "#15803D", fontSize: 13 },
  unused: { color: "#B45309", fontSize: 13 },
  actions: { flexDirection: "row", gap: 24, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { color: "#0B5A47", fontWeight: "600" },
});
