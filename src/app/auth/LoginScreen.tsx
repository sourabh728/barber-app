import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const handleGoogleLogin = () => {
    console.log("Google Login");
  };
  const handleBarberLogin = () => {
    console.log("Barber Login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#12121C", "#0D0D15"]}
        style={styles.card}
      >
        <Text style={styles.logo}>
          BOOK<Text style={styles.logoOrange}>UR</Text>BARBER
        </Text>

        <Text style={styles.heading}>Welcome Back👋</Text>

        <Text style={styles.subtitle}>
          Sign in to continue booking your favourite barber.
        </Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
        >
          <Ionicons name="logo-google" size={22} color="#EA4335" />

          <Text style={styles.googleText}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />

          <Text style={styles.or}>OR</Text>

          <View style={styles.line} />
        </View>
        <TouchableOpacity  onPress={() => router.push("/auth/BarberLoginScreen")}>          
          <Text style={styles.barberLogin}>
            Barber  Login →
          </Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our{" "}
          <Text style={styles.link}>Terms</Text> &{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
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

  googleButton: {
    backgroundColor: "#fff",
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  googleText: {
    marginLeft: 12,
    color: "#111",
    fontSize: 17,
    fontWeight: "700",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 35,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#2B2B40",
  },

  or: {
    color: "#8B8BA7",
    marginHorizontal: 12,
    fontWeight: "600",
  },

  guestButton: {
    height: 55,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2B2B40",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  guestText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
  },

  barberLogin: {
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