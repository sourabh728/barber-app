import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BarberLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const handleLogin = () => {
    console.log("Login Clicked");
  };
  const handleGoogleLogin = () => {
    console.log("Google Login");
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>✂️</Text>
          <Text style={styles.appName}>
            BOOK<Text style={styles.orange}>UR</Text>BARBER
          </Text>
          <Text style={styles.partner}>Barber Partner Portal</Text>
          <Text style={styles.description}>
            Manage appointments, customers and earnings in one place.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
        >
          <Ionicons name="logo-google" size={22} color="#EA4335" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.label}>Email Address</Text>

        <TextInput
          placeholder="barber@example.com"
          placeholderTextColor="#777"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter password"
            placeholderTextColor="#777"
            secureTextEntry={hidePassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => setHidePassword(!hidePassword)}
          >
            <Ionicons
              name={hidePassword ? "eye-off" : "eye"}
              color="#aaa"
              size={22}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.register}>
            New Barber? Register Your Shop →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.back}>
            ← Back to Customer Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B12",
    justifyContent: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "#171722",
    borderRadius: 22,
    padding: 25,
    borderWidth: 1,
    borderColor: "#2A2A3D",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 35,
  },

  logo: {
    fontSize: 45,
  },

  appName: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 10,
  },

  orange: {
    color: "#F5A623",
  },

  partner: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 18,
  },

  description: {
    color: "#9EA0B3",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
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
    marginVertical: 30,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },

  or: {
    color: "#999",
    marginHorizontal: 12,
  },

  label: {
    color: "#fff",
    marginBottom: 8,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#222231",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222231",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 15,
  },

  passwordInput: {
    flex: 1,
    color: "#fff",
    height: 54,
  },

  loginButton: {
    backgroundColor: "#F5A623",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  loginText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  forgot: {
    color: "#F5A623",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },

  register: {
    color: "#fff",
    textAlign: "center",
    marginTop: 35,
    fontSize: 16,
  },

  back: {
    color: "#9EA0B3",
    textAlign: "center",
    marginTop: 25,
    fontSize: 15,
  },
});