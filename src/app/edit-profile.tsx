import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { useSession } from "@/context/session-provider";
import {
  fetchCurrentUser,
  sessionUserFromMe,
  updateCurrentUser,
  updateMyShop,
  type CurrentUserResponse,
} from "@/services/auth-api";
import { getUpdateProfileErrorMessage } from "@/services/auth-errors";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  shopName: string;
  shopDescription: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  shopCity: string;
  shopState: string;
  shopPincode: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  shopName: "",
  shopDescription: "",
  shopPhone: "",
  shopEmail: "",
  shopAddress: "",
  shopCity: "",
  shopState: "",
  shopPincode: "",
};

function formFromProfile(profile: CurrentUserResponse): FormState {
  const shop = profile.shop;
  return {
    name: profile.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    password: "",
    shopName: shop?.name ?? "",
    shopDescription: shop?.description ?? "",
    shopPhone: shop?.phone ?? "",
    shopEmail: shop?.email ?? "",
    shopAddress: shop?.address ?? "",
    shopCity: shop?.city ?? "",
    shopState: shop?.state ?? "",
    shopPincode: shop?.pincode ?? "",
  };
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useSession();
  const isBarber = user?.role === "BARBER";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hidePassword, setHidePassword] = useState(true);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setErrorMessage("");

      try {
        const profile = await fetchCurrentUser();
        if (!cancelled) {
          setForm(formFromProfile(profile));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getUpdateProfileErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdate = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = sanitizePhoneInput(form.phone);
    const shopPhone = sanitizePhoneInput(form.shopPhone);
    const password = form.password;

    if (!name) {
      setErrorMessage("Name is required.");
      return;
    }

    if (!email) {
      setErrorMessage("Email is required.");
      return;
    }

    const phoneError = phoneValidationError(phone);
    if (phoneError) {
      setErrorMessage(phoneError);
      return;
    }

    if (password && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (isBarber) {
      const shopPhoneError = phoneValidationError(shopPhone, {
        label: "Shop phone",
      });
      if (shopPhoneError) {
        setErrorMessage(shopPhoneError);
        return;
      }

      const requiredShop = [
        form.shopName.trim(),
        form.shopAddress.trim(),
        form.shopCity.trim(),
        form.shopState.trim(),
        form.shopPincode.trim(),
      ];

      if (requiredShop.some((value) => !value)) {
        setErrorMessage("Shop name, address, city, state, and pincode are required.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const userPayload = {
        name,
        email,
        phone: phone || undefined,
        ...(password ? { password } : {}),
      };

      const updatedProfile = await updateCurrentUser(userPayload);

      if (isBarber) {
        await updateMyShop({
          name: form.shopName.trim(),
          description: form.shopDescription.trim() || undefined,
          phone: shopPhone || undefined,
          email: form.shopEmail.trim() || undefined,
          address: form.shopAddress.trim(),
          city: form.shopCity.trim(),
          state: form.shopState.trim(),
          pincode: form.shopPincode.trim(),
        });
      }

      const refreshed = isBarber ? await fetchCurrentUser() : updatedProfile;
      setForm(formFromProfile(refreshed));
      updateUser(sessionUserFromMe(refreshed));
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(getUpdateProfileErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

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
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                disabled={isSaving}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.heading}>Edit Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.subtitle}>
              {isBarber
                ? "Update your account and shop details."
                : "Update your account details."}
            </Text>

            {isLoadingProfile ? (
              <ActivityIndicator color="#F97316" style={styles.loader} />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Account</Text>

                <FieldLabel>Name</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(value) => setField("name", value)}
                  placeholder="Your name"
                  placeholderTextColor="#777"
                  editable={!isSaving}
                  autoCapitalize="words"
                />

                <FieldLabel>Email</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(value) => setField("email", value)}
                  placeholder="you@example.com"
                  placeholderTextColor="#777"
                  editable={!isSaving}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(value) =>
                    setField("phone", sanitizePhoneInput(value))
                  }
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#777"
                  editable={!isSaving}
                  keyboardType="number-pad"
                  maxLength={10}
                />

                <FieldLabel>New password (optional)</FieldLabel>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={form.password}
                    onChangeText={(value) => setField("password", value)}
                    placeholder="Leave blank to keep current"
                    placeholderTextColor="#777"
                    editable={!isSaving}
                    secureTextEntry={hidePassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setHidePassword((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      hidePassword ? "Show password" : "Hide password"
                    }
                  >
                    <Ionicons
                      name={hidePassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#8B8BA7"
                    />
                  </TouchableOpacity>
                </View>

                {isBarber ? (
                  <>
                    <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
                      Shop
                    </Text>

                    <FieldLabel>Shop name</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopName}
                      onChangeText={(value) => setField("shopName", value)}
                      placeholder="Shop name"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                    />

                    <FieldLabel>Description</FieldLabel>
                    <TextInput
                      style={[styles.input, styles.multiline]}
                      value={form.shopDescription}
                      onChangeText={(value) =>
                        setField("shopDescription", value)
                      }
                      placeholder="Shop description"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                      multiline
                      textAlignVertical="top"
                    />

                    <FieldLabel>Shop phone</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopPhone}
                      onChangeText={(value) =>
                        setField("shopPhone", sanitizePhoneInput(value))
                      }
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                      keyboardType="number-pad"
                      maxLength={10}
                    />

                    <FieldLabel>Shop email</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopEmail}
                      onChangeText={(value) => setField("shopEmail", value)}
                      placeholder="shop@example.com"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <FieldLabel>Address</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopAddress}
                      onChangeText={(value) => setField("shopAddress", value)}
                      placeholder="Street address"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                    />

                    <FieldLabel>City</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopCity}
                      onChangeText={(value) => setField("shopCity", value)}
                      placeholder="City"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                    />

                    <FieldLabel>State</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopState}
                      onChangeText={(value) => setField("shopState", value)}
                      placeholder="State"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                    />

                    <FieldLabel>Pincode</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopPincode}
                      onChangeText={(value) => setField("shopPincode", value)}
                      placeholder="Pincode"
                      placeholderTextColor="#777"
                      editable={!isSaving}
                      keyboardType="number-pad"
                    />
                  </>
                ) : null}

                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}
                {successMessage ? (
                  <Text style={styles.successText}>{successMessage}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.updateButton, isSaving && styles.buttonDisabled]}
                  onPress={() => {
                    void handleUpdate();
                  }}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSaving, busy: isSaving }}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSpacer: {
    width: 40,
  },

  heading: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  subtitle: {
    color: "#8B8BA7",
    fontSize: 15,
    marginTop: 12,
    marginBottom: 8,
  },

  loader: {
    marginTop: 40,
    marginBottom: 20,
  },

  sectionTitle: {
    color: "#F97316",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },

  sectionSpacing: {
    marginTop: 28,
  },

  label: {
    color: "#C9C9D6",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: "#1A1A26",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },

  multiline: {
    minHeight: 96,
  },

  passwordContainer: {
    backgroundColor: "#1A1A26",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A3A",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 14,
    fontSize: 16,
  },

  errorText: {
    color: "#F87171",
    marginTop: 16,
    fontSize: 14,
  },

  successText: {
    color: "#4ADE80",
    marginTop: 16,
    fontSize: 14,
  },

  updateButton: {
    marginTop: 24,
    backgroundColor: "#F97316",
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  updateButtonText: {
    color: "#111",
    fontSize: 17,
    fontWeight: "700",
  },
});
