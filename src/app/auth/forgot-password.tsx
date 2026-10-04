import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
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

import { useGoogleIdentity } from "@/hooks/use-google-identity";
import {
  lookupAccountByGoogle,
  resetPasswordWithGoogle,
} from "@/services/auth-api";
import { getAuthErrorMessage } from "@/services/auth-errors";
import { LegalAgreementText } from "@/components/legal-agreement-text";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const isBarber = next === "barber";

  const {
    identity,
    isGoogleLoading,
    errorMessage,
    setErrorMessage,
    googleRequestReady,
    continueWithGoogle,
  } = useGoogleIdentity();

  const [accountMissing, setAccountMissing] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const isSubmitting = useRef(false);

  const isBusy = isGoogleLoading || isLookingUp || isSaving;
  const canSetPassword = Boolean(identity && verifiedEmail && !accountMissing);

  const registerHref = useMemo(
    () => (isBarber ? "/auth/barber-register" : "/auth/user-register"),
    [isBarber],
  );

  async function handleContinueWithGoogle() {
    if (isSubmitting.current || isBusy) {
      return;
    }

    setAccountMissing(false);
    setVerifiedEmail("");
    setSuccessMessage("");
    setPassword("");
    setConfirmPassword("");

    const nextIdentity = await continueWithGoogle();
    if (!nextIdentity) {
      return;
    }

    isSubmitting.current = true;
    setIsLookingUp(true);
    setErrorMessage("");

    try {
      const result = await lookupAccountByGoogle(nextIdentity.idToken);

      if (!result.exists) {
        setAccountMissing(true);
        setVerifiedEmail(result.email);
        setErrorMessage(
          result.message ||
            "Email not found. Please register as a new customer or barber.",
        );
        return;
      }

      setVerifiedEmail(result.email);
      setAccountMissing(false);
    } catch (error: unknown) {
      setErrorMessage(
        getAuthErrorMessage(
          error,
          "Could not verify this Google account. Please try again.",
        ),
      );
    } finally {
      isSubmitting.current = false;
      setIsLookingUp(false);
    }
  }

  async function handleUpdatePassword() {
    if (!identity || isSubmitting.current || isBusy) {
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMessage("Enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    isSubmitting.current = true;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await resetPasswordWithGoogle(identity.idToken, password);
      setSuccessMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setErrorMessage(
        getAuthErrorMessage(
          error,
          "Could not update password. Please try again.",
        ),
      );
    } finally {
      isSubmitting.current = false;
      setIsSaving(false);
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
              Trim<Text style={styles.logoOrange}>shim</Text>
            </Text>

            <Text style={styles.heading}>Forgot Password</Text>

            <Text style={styles.subtitle}>
              Continue with Google to verify your email. If the account exists,
              you can set a new password.
            </Text>

            <TouchableOpacity
              style={[
                styles.googleButton,
                (isBusy || !googleRequestReady) && styles.buttonDisabled,
              ]}
              onPress={handleContinueWithGoogle}
              activeOpacity={0.8}
              disabled={isBusy || !googleRequestReady}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isBusy || !googleRequestReady,
                busy: isGoogleLoading || isLookingUp,
              }}
            >
              {isGoogleLoading || isLookingUp ? (
                <ActivityIndicator color="#111" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {verifiedEmail ? (
              <>
                <Text style={styles.label}>Google Email</Text>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={verifiedEmail}
                  editable={false}
                  accessibilityLabel="Verified Google email"
                />
              </>
            ) : null}

            {accountMissing ? (
              <TouchableOpacity
                onPress={() => router.push(registerHref)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Register as new user"
              >
                <Text style={styles.registerLink}>
                  {isBarber
                    ? "Register as a new barber →"
                    : "Register as a new customer →"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {canSetPassword ? (
              <>
                <Text style={styles.label}>New Password</Text>
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
                    editable={!isBusy}
                    accessibilityLabel="New password"
                  />
                  <TouchableOpacity
                    onPress={() => setHidePassword(!hidePassword)}
                    hitSlop={10}
                    disabled={isBusy}
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

                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  placeholder="Re-enter password"
                  placeholderTextColor="#777"
                  secureTextEntry={hidePassword}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  editable={!isBusy}
                  returnKeyType="done"
                  onSubmitEditing={handleUpdatePassword}
                  accessibilityLabel="Confirm password"
                />

                <TouchableOpacity
                  style={[styles.saveButton, isBusy && styles.buttonDisabled]}
                  onPress={handleUpdatePassword}
                  activeOpacity={0.8}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy, busy: isSaving }}
                >
                  {isSaving ? (
                    <View style={styles.saveButtonContent}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.saveButtonText}>Updating...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}

            {successMessage ? (
              <Text style={styles.successText} accessibilityLiveRegion="polite">
                {successMessage}
              </Text>
            ) : null}

            {successMessage ? (
              <TouchableOpacity
                onPress={() =>
                  router.replace(isBarber ? "/auth/barber-login" : "/auth")
                }
                accessibilityRole="button"
                accessibilityLabel="Back to sign in"
              >
                <Text style={styles.back}>← Back to Sign In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  router.replace(isBarber ? "/auth/barber-login" : "/auth")
                }
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel="Back to sign in"
              >
                <Text style={styles.back}>← Back to Sign In</Text>
              </TouchableOpacity>
            )}

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
  googleButton: {
    backgroundColor: "#fff",
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 22,
  },
  googleText: {
    marginLeft: 12,
    color: "#111",
    fontSize: 17,
    fontWeight: "700",
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
  inputReadonly: {
    opacity: 0.85,
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
    marginBottom: 18,
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
  successText: {
    color: "#7DDEA4",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  registerLink: {
    color: "#F6A623",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#F6A623",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
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
