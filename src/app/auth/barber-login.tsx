import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLoginActions } from "@/hooks/use-login-actions";
import { LegalAgreementText } from "@/components/legal-agreement-text";

export default function BarberLoginScreen() {
  const router = useRouter();
  const {
    isLoading,
    isGoogleLoading,
    errorMessage,
    googleRequestReady,
    handleGoogleLogin,
  } = useLoginActions({ role: "BARBER" });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
            <Text style={styles.logo}>
              Trim<Text style={styles.logoOrange}>shim</Text>
            </Text>

            <Text style={styles.heading}>Barber Partner👋</Text>

            <Text style={styles.subtitle}>
              Continue with Google to manage your shop. New and existing barbers
              use the same button. First-time partners will set up the shop
              next.
            </Text>

            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.googleButton,
                (isLoading || !googleRequestReady) && styles.buttonDisabled,
              ]}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
              disabled={isLoading || !googleRequestReady}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isLoading || !googleRequestReady,
                busy: isGoogleLoading,
              }}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/auth")}
              activeOpacity={0.7}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Back to customer login"
            >
              <Text style={styles.back}>← Back to Customer Login</Text>
            </TouchableOpacity>

            <LegalAgreementText style={styles.terms} linkStyle={styles.link} />
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090F",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 25,
    padding: 28,
    borderWidth: 1,
    borderColor: "#232336",
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 40,
  },
  logoOrange: {
    color: "#F6A623",
  },
  heading: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#8B8BA7",
    marginTop: 10,
    fontSize: 16,
    marginBottom: 36,
    lineHeight: 24,
  },
  errorText: {
    color: "#FF8A8A",
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  googleButton: {
    backgroundColor: "#fff",
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  googleText: {
    marginLeft: 12,
    color: "#111",
    fontSize: 17,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  back: {
    marginTop: 28,
    color: "#F6A623",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  terms: {
    marginTop: 45,
    color: "#777",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: "#F6A623",
    fontWeight: "600",
  },
});
