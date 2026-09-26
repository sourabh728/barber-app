import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { forgotPassword } from "@/services/auth-api";
import { getOtpErrorMessage } from "@/services/auth-errors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const isBarber = next === "barber";

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submitting = useRef(false);

  const loginHref = useMemo(
    () => (isBarber ? "/auth/barber-login" : "/auth"),
    [isBarber],
  );

  async function handleSend() {
    if (submitting.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email address.");
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await forgotPassword(normalizedEmail);
      router.push({
        pathname: "/auth/reset-password",
        params: {
          email: normalizedEmail,
          next: isBarber ? "barber" : "customer",
        },
      });
    } catch (error) {
      setErrorMessage(getOtpErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
            <Text style={styles.logo}>
              BOOK<Text style={styles.logoOrange}>UR</Text>BARBER
            </Text>
            <Text style={styles.heading}>Forgot password</Text>
            <Text style={styles.subtitle}>
              Enter your account email. We will send a 6-digit OTP so you can
              create a new password.
            </Text>

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#777"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabled]}
              onPress={() => void handleSend()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace(loginHref)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>Back to login</Text>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090F" },
  flex: { flex: 1 },
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
    marginBottom: 32,
  },
  logoOrange: { color: "#F6A623" },
  heading: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#8B8BA7",
    marginTop: 10,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: "#C9C9D6",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1A1A27",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    marginBottom: 16,
  },
  errorText: {
    color: "#F87171",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#F6A623",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.7 },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    color: "#8B8BA7",
    fontWeight: "600",
  },
});
