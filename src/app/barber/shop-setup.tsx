import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { StateCityPicker } from "@/components/state-city-picker";
import { BarberCountPicker } from "@/components/barber-count-picker";
import { createMyShop, getShopsErrorMessage } from "@/services/shops-api";
import { takePendingRegistrationQr } from "@/utils/registration-qr";
import {
  phoneValidationError,
  sanitizePhoneInput,
} from "@/utils/phone";

export default function BarberShopSetupScreen() {
  const router = useRouter();
  const { user } = useSession();
  const isSubmitting = useRef(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [barberCount, setBarberCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const scanned = takePendingRegistrationQr();
      if (scanned) {
        setQrPayload(scanned);
      }
    }, []),
  );

  async function handleCreateShop() {
    if (isSubmitting.current) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
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
      setErrorMessage("Enter your shop phone number.");
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

    isSubmitting.current = true;
    setIsLoading(true);
    setErrorMessage("");

    try {
      await createMyShop({
        name: normalizedName,
        phone: normalizedPhone,
        address: normalizedAddress,
        city: normalizedCity,
        state: normalizedState,
        pincode: normalizedPincode,
        barberCount,
        ...(user?.email ? { email: user.email } : {}),
        ...(normalizedDescription
          ? { description: normalizedDescription }
          : {}),
        ...(qrPayload ? { qrPayload } : {}),
      });
      router.replace("/profile");
    } catch (error: unknown) {
      setErrorMessage(
        getShopsErrorMessage(error, "Could not create shop. Please try again."),
      );
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

            <Text style={styles.heading}>Set up your shop</Text>
            <Text style={styles.subtitle}>
              You’re signed in with Google
              {user?.email ? ` (${user.email})` : ""}. Add shop details so
              customers can find you.
            </Text>

            <Text style={styles.label}>Shop Name</Text>
            <TextInput
              placeholder="Shop name"
              placeholderTextColor="#777"
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
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
              editable={!isLoading}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              placeholder="10-digit mobile number"
              placeholderTextColor="#777"
              style={styles.input}
              value={phone}
              onChangeText={(value) => setPhone(sanitizePhoneInput(value))}
              keyboardType="number-pad"
              maxLength={10}
              editable={!isLoading}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              placeholder="Street address"
              placeholderTextColor="#777"
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              editable={!isLoading}
            />

            <StateCityPicker
              state={state}
              city={city}
              disabled={isLoading}
              labelStyle={styles.label}
              inputStyle={styles.input}
              onChange={(next) => {
                setState(next.state);
                setCity(next.city);
              }}
            />

            <Text style={styles.label}>Pincode</Text>
            <TextInput
              placeholder="Pincode"
              placeholderTextColor="#777"
              style={styles.input}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              editable={!isLoading}
            />

            <BarberCountPicker
              value={barberCount}
              onChange={setBarberCount}
              disabled={isLoading}
              labelStyle={styles.label}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Text style={styles.label}>Registration QR (optional)</Text>
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => router.push("/barber/scan-registration-qr")}
              disabled={isLoading}
            >
              <Text style={styles.qrButtonText}>
                {qrPayload ? "✓ QR linked — tap to rescan" : "Scan QR from Trimshim"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleCreateShop}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Save shop & continue</Text>
              )}
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
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
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
    marginBottom: 28,
  },
  logoOrange: { color: "#F6A623" },
  heading: { color: "#fff", fontSize: 30, fontWeight: "800" },
  subtitle: {
    color: "#8B8BA7",
    marginTop: 10,
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
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
  multilineInput: {
    height: 96,
    paddingTop: 14,
  },
  errorText: {
    color: "#FF8A8A",
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#F6A623",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  buttonDisabled: { opacity: 0.7 },
  qrButton: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F6A623",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  qrButtonText: { color: "#F6A623", fontWeight: "700", fontSize: 15 },
});
