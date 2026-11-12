import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePendingGoogleIdentity } from "@/context/pending-google-identity";

export default function ChooseRegistrationScreen() {
  const router = useRouter();
  const { pendingIdentity, setPendingIdentity } = usePendingGoogleIdentity();

  function backToSignIn() {
    setPendingIdentity(null);
    router.replace("/auth");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LinearGradient colors={["#12121C", "#0D0D15"]} style={styles.card}>
          <Text style={styles.logo}>
            Trim<Text style={styles.accent}>shim</Text>
          </Text>
          <Text style={styles.heading}>Account not found</Text>
          <Text style={styles.subtitle} accessibilityLiveRegion="polite">
            {pendingIdentity
              ? `No account was found for ${pendingIdentity.email}. Choose how you would like to register.`
              : "Your Google sign-in has expired. Please sign in again."}
          </Text>
          {pendingIdentity ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/auth/user-register")}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Register as Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace("/auth/barber-register")}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>Register as Barber</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity onPress={backToSignIn} accessibilityRole="button">
            <Text style={styles.back}>Back to Sign In</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090F" },
  content: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderRadius: 25, padding: 28, borderWidth: 1, borderColor: "#232336" },
  logo: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 40 },
  accent: { color: "#F6A623" },
  heading: { color: "#fff", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#8B8BA7", marginTop: 10, marginBottom: 30, fontSize: 16, lineHeight: 24 },
  primaryButton: { backgroundColor: "#F6A623", height: 58, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  secondaryButton: { borderColor: "#F6A623", borderWidth: 1, height: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 14 },
  secondaryText: { color: "#F6A623", fontSize: 17, fontWeight: "800" },
  back: { color: "#fff", marginTop: 24, textAlign: "center", fontWeight: "600" },
});
