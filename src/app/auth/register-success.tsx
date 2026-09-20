import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterSuccessScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const isBarber = next === "barber";
  const loginHref = isBarber ? "/auth/barber-login" : "/auth";

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
        <Text style={styles.logo}>
          BOOK<Text style={styles.logoOrange}>UR</Text>BARBER
        </Text>

        <Text style={styles.heading}>Account created</Text>

        <Text style={styles.subtitle}>
          {isBarber
            ? "Your barber partner account is ready. Sign in to continue and set up your shop."
            : "Your account is ready. Sign in with your email and password to continue."}
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace(loginHref)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isBarber ? "Go to barber login" : "Go to login"
          }
        >
          <Text style={styles.loginText}>
            {isBarber ? "Go to Barber Login" : "Go to Login"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090F",
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

  loginButton: {
    backgroundColor: "#F6A623",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  loginText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
});
