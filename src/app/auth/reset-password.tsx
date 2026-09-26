import { Ionicons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { forgotPassword, resetPassword } from "@/services/auth-api";
import { getOtpErrorMessage } from "@/services/auth-errors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; next?: string }>();
  const email = useMemo(
    () =>
      (Array.isArray(params.email) ? params.email[0] : params.email)?.trim() ??
      "",
    [params.email],
  );
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const isBarber = next === "barber";
  const loginHref = isBarber ? "/auth/barber-login" : "/auth";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(
    email
      ? `Enter the OTP sent to ${email} and choose a new password.`
      : "Enter the OTP from your email and choose a new password.",
  );
  const submitting = useRef(false);

  async function handleReset() {
    if (submitting.current) return;
    if (!email) {
      setErrorMessage("Missing email. Start again from Forgot Password.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage("Enter the 6-digit OTP.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    submitting.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await resetPassword({ email, otp, newPassword });
      router.replace(loginHref);
    } catch (error) {
      setErrorMessage(getOtpErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email || isResending || isLoading) return;
    setIsResending(true);
    setErrorMessage("");
    try {
      const result = await forgotPassword(email);
      setInfoMessage(result.message);
    } catch (error) {
      setErrorMessage(getOtpErrorMessage(error));
    } finally {
      setIsResending(false);
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
            <Text style={styles.heading}>Create new password</Text>
            <Text style={styles.subtitle}>{infoMessage}</Text>

            <Text style={styles.label}>OTP</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={(value) =>
                setOtp(value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit code"
              placeholderTextColor="#777"
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />

            <Text style={styles.label}>New password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#777"
                secureTextEntry={hidePassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setHidePassword((prev) => !prev)}
                hitSlop={10}
              >
                <Ionicons
                  name={hidePassword ? "eye-off" : "eye"}
                  color="#aaa"
                  size={22}
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabled]}
              onPress={() => void handleReset()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Update password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleResend()}
              disabled={isResending || isLoading}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {isResending ? "Sending..." : "Resend OTP"}
              </Text>
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
    letterSpacing: 4,
    fontSize: 18,
  },
  passwordContainer: {
    backgroundColor: "#1A1A27",
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 14,
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
