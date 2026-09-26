import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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

import { registerWithEmail } from "@/services/auth-api";
import { getRegisterErrorMessage } from "@/services/auth-errors";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";

export default function UserRegisterScreen() {
  const router = useRouter();
  const isSubmitting = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    if (isSubmitting.current) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = sanitizePhoneInput(phone);

    if (!normalizedName) {
      setErrorMessage("Enter your name.");
      return;
    }

    if (!normalizedEmail || !password) {
      setErrorMessage("Enter your email address and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    const phoneError = phoneValidationError(normalizedPhone);
    if (phoneError) {
      setErrorMessage(phoneError);
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await registerWithEmail({
        name: normalizedName,
        email: normalizedEmail,
        password,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      });

      router.replace("/auth/register-success");
    } catch (error: unknown) {
      setErrorMessage(getRegisterErrorMessage(error));
    } finally {
      isSubmitting.current = false;
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
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
            <Text style={styles.logo}>
              BOOK<Text style={styles.logoOrange}>UR</Text>BARBER
            </Text>

            <Text style={styles.heading}>Create Account</Text>

            <Text style={styles.subtitle}>
              Sign up to start booking your favourite barber.
            </Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              placeholder="Your name"
              placeholderTextColor="#777"
              style={styles.input}
              value={name}
              onChangeText={setName}
              textContentType="name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              accessibilityLabel="Full name"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#777"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              accessibilityLabel="Email address"
            />

            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput
              placeholder="10-digit mobile number"
              placeholderTextColor="#777"
              style={styles.input}
              value={phone}
              onChangeText={(value) => setPhone(sanitizePhoneInput(value))}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              maxLength={10}
              editable={!isLoading}
              returnKeyType="next"
              accessibilityLabel="Phone number, optional"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="At least 6 characters"
                placeholderTextColor="#777"
                secureTextEntry={hidePassword}
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setHidePassword(!hidePassword)}
                hitSlop={10}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={
                  hidePassword ? "Show password" : "Hide password"
                }
              >
                <Ionicons
                  name={hidePassword ? "eye-off" : "eye"}
                  color="#aaa"
                  size={22}
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <View style={styles.registerButtonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.registerButtonText}>Creating...</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/auth")}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <Text style={styles.backToLogin}>← Back to Sign In</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing you agree to our{" "}
              <Text style={styles.link}>Terms</Text> &{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
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
    marginBottom: 45,
    lineHeight: 24,
  },

  label: {
    color: "#fff",
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 14,
  },

  input: {
    backgroundColor: "#1A1A28",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#232336",
    fontSize: 16,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A28",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232336",
    paddingHorizontal: 15,
    height: 54,
  },

  passwordInput: {
    flex: 1,
    color: "#fff",
    height: 54,
    fontSize: 16,
  },

  errorText: {
    color: "#FF8A8A",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },

  registerButton: {
    backgroundColor: "#F6A623",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
  },

  registerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  backToLogin: {
    marginTop: 35,
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
