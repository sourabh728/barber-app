import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  uploadProfilePhoto,
  uploadShopPhoto,
  type CurrentUserResponse,
} from "@/services/auth-api";
import { getUpdateProfileErrorMessage } from "@/services/auth-errors";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";
import { profileImageSource, shopImageSource } from "@/utils/media";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  photoUrl: string | null;
  shopName: string;
  shopDescription: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  shopCity: string;
  shopState: string;
  shopPincode: string;
  shopPhotoUrl: string | null;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  photoUrl: null,
  shopName: "",
  shopDescription: "",
  shopPhone: "",
  shopEmail: "",
  shopAddress: "",
  shopCity: "",
  shopState: "",
  shopPincode: "",
  shopPhotoUrl: null,
};

function formFromProfile(profile: CurrentUserResponse): FormState {
  const shop = profile.shop;
  return {
    name: profile.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    password: "",
    photoUrl: profile.photoUrl ?? null,
    shopName: shop?.name ?? "",
    shopDescription: shop?.description ?? "",
    shopPhone: shop?.phone ?? "",
    shopEmail: shop?.email ?? "",
    shopAddress: shop?.address ?? "",
    shopCity: shop?.city ?? "",
    shopState: shop?.state ?? "",
    shopPincode: shop?.pincode ?? "",
    shopPhotoUrl: shop?.photoUrl ?? null,
  };
}

async function pickImage(aspect: [number, number]) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      "Allow photo library access to upload a picture.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useSession();
  const isBarber = user?.role === "BARBER";

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingShopPhoto, setIsUploadingShopPhoto] = useState(false);
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
          updateUser(sessionUserFromMe(profile));
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
    // Load once on mount. updateUser is stable; including it would be fine,
    // but we intentionally avoid refetch loops if session identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only fetch
  }, []);

  const handlePickProfilePhoto = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const uri = await pickImage([1, 1]);
    if (!uri) return;

    setIsUploadingPhoto(true);
    try {
      const profile = await uploadProfilePhoto(uri);
      setForm(formFromProfile(profile));
      updateUser(sessionUserFromMe(profile));
      setSuccessMessage("Profile photo updated.");
    } catch (error) {
      setErrorMessage(getUpdateProfileErrorMessage(error));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePickShopPhoto = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const uri = await pickImage([4, 3]);
    if (!uri) return;

    setIsUploadingShopPhoto(true);
    try {
      const shop = await uploadShopPhoto(uri);
      setForm((prev) => ({ ...prev, shopPhotoUrl: shop.photoUrl }));
      setSuccessMessage("Shop photo updated.");
    } catch (error) {
      setErrorMessage(getUpdateProfileErrorMessage(error));
    } finally {
      setIsUploadingShopPhoto(false);
    }
  };

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
        setErrorMessage(
          "Shop name, address, city, state, and pincode are required.",
        );
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

  const busy = isSaving || isUploadingPhoto || isUploadingShopPhoto;

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
                disabled={busy}
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

                <View style={styles.photoBlock}>
                  <Image
                    source={profileImageSource(form.photoUrl)}
                    style={styles.profilePhoto}
                  />
                  <TouchableOpacity
                    style={[
                      styles.photoButton,
                      isUploadingPhoto && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      void handlePickProfilePhoto();
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                  >
                    {isUploadingPhoto ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={16} color="#111" />
                        <Text style={styles.photoButtonText}>
                          {form.photoUrl ? "Change photo" : "Upload photo"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <FieldLabel>Name</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(value) => setField("name", value)}
                  placeholder="Your name"
                  placeholderTextColor="#777"
                  editable={!busy}
                  autoCapitalize="words"
                />

                <FieldLabel>Email</FieldLabel>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(value) => setField("email", value)}
                  placeholder="you@example.com"
                  placeholderTextColor="#777"
                  editable={!busy}
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
                  editable={!busy}
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
                    editable={!busy}
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

                    <View style={styles.photoBlock}>
                      <Image
                        source={shopImageSource(form.shopPhotoUrl)}
                        style={styles.shopPhoto}
                      />
                      <TouchableOpacity
                        style={[
                          styles.photoButton,
                          isUploadingShopPhoto && styles.buttonDisabled,
                        ]}
                        onPress={() => {
                          void handlePickShopPhoto();
                        }}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Change shop photo"
                      >
                        {isUploadingShopPhoto ? (
                          <ActivityIndicator color="#111" />
                        ) : (
                          <>
                            <Ionicons
                              name="image-outline"
                              size={16}
                              color="#111"
                            />
                            <Text style={styles.photoButtonText}>
                              {form.shopPhotoUrl
                                ? "Change shop photo"
                                : "Upload shop photo"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    <FieldLabel>Shop name</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopName}
                      onChangeText={(value) => setField("shopName", value)}
                      placeholder="Shop name"
                      placeholderTextColor="#777"
                      editable={!busy}
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
                      editable={!busy}
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
                      editable={!busy}
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
                      editable={!busy}
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
                      editable={!busy}
                    />

                    <FieldLabel>City</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopCity}
                      onChangeText={(value) => setField("shopCity", value)}
                      placeholder="City"
                      placeholderTextColor="#777"
                      editable={!busy}
                    />

                    <FieldLabel>State</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopState}
                      onChangeText={(value) => setField("shopState", value)}
                      placeholder="State"
                      placeholderTextColor="#777"
                      editable={!busy}
                    />

                    <FieldLabel>Pincode</FieldLabel>
                    <TextInput
                      style={styles.input}
                      value={form.shopPincode}
                      onChangeText={(value) => setField("shopPincode", value)}
                      placeholder="Pincode"
                      placeholderTextColor="#777"
                      editable={!busy}
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
                  style={[styles.updateButton, busy && styles.buttonDisabled]}
                  onPress={() => {
                    void handleUpdate();
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy }}
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

  photoBlock: {
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },

  profilePhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1A1A26",
  },

  shopPhoto: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#1A1A26",
  },

  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F97316",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
  },

  photoButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
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
