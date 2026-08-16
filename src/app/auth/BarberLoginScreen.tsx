import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BarberLoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);

  const handleLogin = () => {
    if (!email || !password) {
      console.log("Please enter email and password");
      return;
    }

    console.log("Barber Login:", { email, password });
  };

  const handleGoogleLogin = () => {
    console.log("Google Login");
  };

  const handleForgotPassword = () => {
    console.log("Forgot Password");
  };

  const handleRegister = () => {
    console.log("Register Your Shop");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>✂️</Text>

            <Text style={styles.appName}>
              BOOK<Text style={styles.orange}>UR</Text>BARBER
            </Text>

            <Text style={styles.partner}>
              Barber Partner Portal
            </Text>

            <Text style={styles.description}>
              Manage appointments, customers and earnings in one place.
            </Text>
          </View>

          {/* Google Login */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Ionicons
              name="logo-google"
              size={22}
              color="#EA4335"
            />

            <Text style={styles.googleText}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />

            <Text style={styles.or}>OR</Text>

            <View style={styles.line} />
          </View>

          {/* Email */}
          <Text style={styles.label}>
            Email Address 
          </Text>

          <TextInput
            placeholder="barber@example.com"
            placeholderTextColor="#777"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password */}
          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Enter password"
              placeholderTextColor="#777"
              secureTextEntry={hidePassword}
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => setHidePassword(!hidePassword)}
              hitSlop={10}
            >
              <Ionicons
                name={hidePassword ? "eye-off" : "eye"}
                color="#aaa"
                size={22}
              />
            </TouchableOpacity>
          </View>

          {/* Sign In */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginText}>
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            activeOpacity={0.7}
          >
            <Text style={styles.forgot}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity
            onPress={handleRegister}
            activeOpacity={0.7}
          >
            <Text style={styles.register}>
              New Barber? Register Your Shop →
            </Text>
          </TouchableOpacity>

          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.back}>
              ← Back to Customer Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B12",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  card: {
    width: "100%",
    backgroundColor: "#171722",
    borderRadius: 22,
    padding: 25,
    borderWidth: 1,
    borderColor: "#2A2A3D",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    fontSize: 40,
  },

  appName: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },

  orange: {
    color: "#F5A623",
  },

  partner: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 15,
  },

  description: {
    color: "#9EA0B3",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    fontSize: 14,
  },

  googleButton: {
    backgroundColor: "#fff",
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  googleText: {
    color: "#111",
    fontWeight: "700",
    marginLeft: 10,
    fontSize: 16,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 26,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },

  or: {
    color: "#999",
    marginHorizontal: 12,
    fontWeight: "600",
  },

  label: {
    color: "#fff",
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 14,
  },

  input: {
    backgroundColor: "#222231",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222231",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 15,
    height: 54,
  },

  passwordInput: {
    flex: 1,
    color: "#fff",
    height: 54,
    fontSize: 16,
  },

  loginButton: {
    backgroundColor: "#F5A623",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
  },

  loginText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  forgot: {
    color: "#F5A623",
    textAlign: "center",
    marginTop: 18,
    fontWeight: "600",
  },

  register: {
    color: "#fff",
    textAlign: "center",
    marginTop: 28,
    fontSize: 15,
    fontWeight: "600",
  },

  back: {
    color: "#9EA0B3",
    textAlign: "center",
    marginTop: 22,
    fontSize: 15,
    paddingBottom: 2,
  },
});
