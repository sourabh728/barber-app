import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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

import { LegalAgreementText } from "@/components/legal-agreement-text";
import { useGoogleIdentity } from "@/hooks/use-google-identity";
import { registerBarber } from "@/services/auth-api";
import { getRegisterErrorMessage } from "@/services/auth-errors";
import { phoneValidationError, sanitizePhoneInput } from "@/utils/phone";

export default function BarberRegisterScreen() {
  const router = useRouter();
  const isSubmitting = useRef(false);

  const {
    identity,
    isGoogleLoading,
    errorMessage,
    setErrorMessage,
    googleRequestReady,
    continueWithGoogle,
  } = useGoogleIdentity();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const googleVerified = Boolean(identity?.email);
  const isBusy = isLoading || isGoogleLoading;

  async function handleRegister() {
    if (isSubmitting.current || isBusy) {
      return;
    }

    if (!identity?.email) {
      setErrorMessage("Continue with Google first to verify your email.");
      return;
    }

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedEmail = identity.email;
    const normalizedPhone = sanitizePhoneInput(phone);
    const normalizedAddress = address.trim();
    const normalizedCity = city.trim();
    const normalizedState = state.trim();
    const normalizedPincode = pincode.trim();

    if (!normalizedName) {
      setErrorMessage("Enter your shop name.");
      return;
    }

    if (!normalizedPhone) {
      setErrorMessage("Enter your phone number.");
      return;
    }

    const phoneError = phoneValidationError(normalizedPhone, { required: true });
    if (phoneError) {
      setErrorMessage(phoneError);
      return;
    }

    if (!normalizedAddress) {
      setErrorMessage("Enter your shop address.");
      return;
    }

    if (!normalizedCity) {
      setErrorMessage("Enter your city.");
      return;
    }

    if (!normalizedState) {
      setErrorMessage("Enter your state.");
      return;
    }

    if (!normalizedPincode) {
      setErrorMessage("Enter your pincode.");
      return;
    }

    if (!password) {
      setErrorMessage("Enter a password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await registerBarber({
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
        address: normalizedAddress,
        city: normalizedCity,
        state: normalizedState,
        pincode: normalizedPincode,
        ...(normalizedDescription
          ? { description: normalizedDescription }
          : {}),
      });

      router.replace("/auth/barber-login");
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
              Trim<Text style={styles.logoOrange}>shim</Text>
            </Text>

            <Text style={styles.heading}>Register Your Shop</Text>

            <Text style={styles.subtitle}>
              Continue with Google first. Your email will be filled in, then
              complete your shop details.
            </Text>

            <TouchableOpacity
              style={[
                styles.googleButton,
                (isBusy || !googleRequestReady) && styles.buttonDisabled,
              ]}
              onPress={continueWithGoogle}
              activeOpacity={0.8}
              disabled={isBusy || !googleRequestReady}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isBusy || !googleRequestReady,
                busy: isGoogleLoading,
              }}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                  <Text style={styles.googleText}>
                    {googleVerified
                      ? "Google verified"
                      : "Continue with Google"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {googleVerified ? (
              <>
                <Text style={styles.label}>Shop Name</Text>
                <TextInput
                  placeholder="Shop name"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  textContentType="organizationName"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="Shop name"
                />

                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  placeholder="Premium men's grooming"
                  placeholderTextColor="#777"
                  style={[styles.input, styles.multilineInput]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="Shop description, optional"
                />

                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  placeholder="shop@example.com"
                  placeholderTextColor="#777"
                  style={[styles.input, styles.inputReadonly]}
                  value={identity?.email ?? ""}
                  editable={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  accessibilityLabel="Email address from Google"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={phone}
                  onChangeText={(value) => setPhone(sanitizePhoneInput(value))}
                  keyboardType="number-pad"
                  textContentType="telephoneNumber"
                  maxLength={10}
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="Phone number"
                />

                <Text style={styles.label}>Address</Text>
                <TextInput
                  placeholder="Street address"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  textContentType="fullStreetAddress"
                  autoCapitalize="words"
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="Shop address"
                />

                <Text style={styles.label}>City</Text>
                <TextInput
                  placeholder="City"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  textContentType="addressCity"
                  autoCapitalize="words"
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="City"
                />

                <Text style={styles.label}>State</Text>
                <TextInput
                  placeholder="State"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  textContentType="addressState"
                  autoCapitalize="words"
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="State"
                />

                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  placeholder="Pincode"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                  textContentType="postalCode"
                  editable={!isBusy}
                  returnKeyType="next"
                  accessibilityLabel="Pincode"
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
                    editable={!isBusy}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    accessibilityLabel="Password"
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

                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    isBusy && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  activeOpacity={0.8}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy, busy: isLoading }}
                >
                  {isLoading ? (
                    <View style={styles.registerButtonContent}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.registerButtonText}>Creating...</Text>
                    </View>
                  ) : (
                    <Text style={styles.registerButtonText}>Register Shop</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={() => router.replace("/auth/barber-login")}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Back to barber sign in"
            >
              <Text style={styles.backToLogin}>← Back to Barber Sign In</Text>
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
  multilineInput: {
    height: 96,
    paddingTop: 14,
    paddingBottom: 14,
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
