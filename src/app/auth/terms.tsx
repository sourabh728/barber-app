import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsOfServiceScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>Trimshim</Text>
        <Text style={styles.updated}>Last updated: 28 September 2026</Text>

        <Text style={styles.paragraph}>
          By using Trimshim, you agree to these Terms of Service. If you do
          not agree, please do not use the app.
        </Text>

        <Text style={styles.heading}>1. The service</Text>
        <Text style={styles.paragraph}>
          Trimshim helps customers discover barber shops and book
          appointments, and helps barbers manage shop profiles, staff,
          schedules, and bookings.
        </Text>

        <Text style={styles.heading}>2. Accounts</Text>
        <Text style={styles.bullet}>
          • You must provide accurate account information.
        </Text>
        <Text style={styles.bullet}>
          • You are responsible for keeping your login details secure.
        </Text>
        <Text style={styles.bullet}>
          • You must be legally allowed to use the app in your region.
        </Text>

        <Text style={styles.heading}>3. Bookings and shops</Text>
        <Text style={styles.bullet}>
          • Appointments may require shop approval and can be confirmed,
          rejected, or cancelled based on shop and app rules.
        </Text>
        <Text style={styles.bullet}>
          • Service quality and fulfilment are the responsibility of the shop.
        </Text>
        <Text style={styles.bullet}>
          • Prices are set by shops. Payment may be collected at the shop
          (cash, card, or UPI) unless online payments are added later.
        </Text>

        <Text style={styles.heading}>4. Acceptable use</Text>
        <Text style={styles.paragraph}>You agree not to:</Text>
        <Text style={styles.bullet}>• Provide false or misleading information</Text>
        <Text style={styles.bullet}>• Harass customers, barbers, or staff</Text>
        <Text style={styles.bullet}>
          • Attempt to disrupt, hack, or misuse the service
        </Text>
        <Text style={styles.bullet}>
          • Upload unlawful, offensive, or infringing photos or content
        </Text>

        <Text style={styles.heading}>5. Photos and content</Text>
        <Text style={styles.paragraph}>
          Profile and shop photos you upload must be appropriate and content you
          have the right to use. We may remove content that violates these
          Terms.
        </Text>

        <Text style={styles.heading}>6. Disclaimers</Text>
        <Text style={styles.paragraph}>
          The app is provided “as is.” We do not guarantee uninterrupted or
          error-free service. We are not responsible for disputes between
          customers and shops beyond facilitating bookings in the app.
        </Text>

        <Text style={styles.heading}>7. Limitation of liability</Text>
        <Text style={styles.paragraph}>
          To the fullest extent allowed by law, Trimshim is not liable for
          indirect, incidental, or consequential damages arising from your use
          of the app or shop services.
        </Text>

        <Text style={styles.heading}>8. Changes</Text>
        <Text style={styles.paragraph}>
          We may update these Terms from time to time. Continued use of the app
          after changes means you accept the updated Terms.
        </Text>

        <Text style={styles.heading}>9. Contact</Text>
        <Text style={styles.paragraph}>
          Questions: solutionsfromyukti@gmail.com or call 8458892295.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  brand: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B5A47",
  },
  updated: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: "#64748B",
  },
  heading: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    marginBottom: 4,
    paddingLeft: 4,
  },
});
