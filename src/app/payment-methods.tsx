import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStorageState } from "@/hooks/use-storage-state";

const STORAGE_KEY = "preferredPaymentMethod";

type PaymentMethodId = "cash" | "card_debit" | "card_credit" | "upi";

type PaymentOption = {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  group?: "card";
};

const OPTIONS: PaymentOption[] = [
  {
    id: "cash",
    title: "Cash",
    subtitle: "Pay at the shop after your service",
    icon: <Ionicons name="cash-outline" size={22} color="#0B5A47" />,
  },
  {
    id: "card_debit",
    title: "Debit Card",
    subtitle: "Visa, Mastercard, RuPay and more",
    icon: <Ionicons name="card-outline" size={22} color="#2563EB" />,
    group: "card",
  },
  {
    id: "card_credit",
    title: "Credit Card",
    subtitle: "Pay with your credit card at checkout",
    icon: (
      <MaterialCommunityIcons name="credit-card-outline" size={22} color="#7C3AED" />
    ),
    group: "card",
  },
  {
    id: "upi",
    title: "UPI",
    subtitle: "GPay, PhonePe, Paytm and other UPI apps",
    icon: <Ionicons name="phone-portrait-outline" size={22} color="#EA580C" />,
  },
];

function isPaymentMethodId(value: string | null): value is PaymentMethodId {
  return (
    value === "cash" ||
    value === "card_debit" ||
    value === "card_credit" ||
    value === "upi"
  );
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [[isLoading, stored], setStored] = useStorageState(STORAGE_KEY);
  const [selected, setSelected] = useState<PaymentMethodId>("cash");

  useEffect(() => {
    if (!isLoading && isPaymentMethodId(stored)) {
      setSelected(stored);
    }
  }, [isLoading, stored]);

  const selectMethod = (id: PaymentMethodId) => {
    setSelected(id);
    setStored(id);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.intro}>
            Choose how you prefer to pay for appointments. You can change this
            anytime.
          </Text>

          <Text style={styles.sectionLabel}>Cash</Text>
          {OPTIONS.filter((o) => o.id === "cash").map((option) => (
            <MethodRow
              key={option.id}
              option={option}
              selected={selected === option.id}
              onPress={() => selectMethod(option.id)}
            />
          ))}

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Card</Text>
          {OPTIONS.filter((o) => o.group === "card").map((option) => (
            <MethodRow
              key={option.id}
              option={option}
              selected={selected === option.id}
              onPress={() => selectMethod(option.id)}
            />
          ))}

          <Text style={[styles.sectionLabel, styles.sectionSpacing]}>UPI</Text>
          {OPTIONS.filter((o) => o.id === "upi").map((option) => (
            <MethodRow
              key={option.id}
              option={option}
              selected={selected === option.id}
              onPress={() => selectMethod(option.id)}
            />
          ))}

          <Text style={styles.note}>
            Online card and UPI checkout will be enabled in a future update.
            Cash is always available at the shop.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MethodRow({
  option,
  selected,
  onPress,
}: {
  option: PaymentOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.methodRow, selected && styles.methodRowSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={option.title}
    >
      <View style={styles.iconCircle}>{option.icon}</View>
      <View style={styles.methodText}>
        <Text style={styles.methodTitle}>{option.title}</Text>
        <Text style={styles.methodSubtitle}>{option.subtitle}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 32,
    minHeight: 520,
  },

  intro: {
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  sectionLabel: {
    color: "#0B5A47",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  sectionSpacing: {
    marginTop: 18,
  },

  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },

  methodRowSelected: {
    borderColor: "#0B5A47",
    backgroundColor: "#F0FDFA",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  methodText: {
    flex: 1,
  },

  methodTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },

  methodSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#0B5A47",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0B5A47",
  },

  note: {
    marginTop: 20,
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
