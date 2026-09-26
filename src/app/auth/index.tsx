import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

import { useLoginActions } from "@/hooks/use-login-actions";

export default function LoginScreen() {
  const router = useRouter();
  const {
    email,
    setEmail,
    password,
    setPassword,
    hidePassword,
    setHidePassword,
    isLoading,
    isEmailLoading,
    // isGoogleLoading,
    errorMessage,
    // googleRequestReady,
    handleEmailLogin,
    // handleGoogleLogin,
  } = useLoginActions({ role: "CUSTOMER" });

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
              BOOK<Text style={styles.logoOrange}>UR</Text>LOOK
            </Text>

            <Text style={styles.heading}>Welcome Back👋</Text>

            <Text style={styles.subtitle}>
              Sign in to continue booking your favourite barber.
            </Text>

            {/* Google login is unused while the app uses email/password JWT.
            <TouchableOpacity
              style={[
                styles.googleButton,
                (isLoading || !googleRequestReady) && styles.buttonDisabled,
              ]}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
              disabled={isLoading || !googleRequestReady}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isLoading || !googleRequestReady,
                busy: isGoogleLoading,
              }}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#111" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#EA4335" />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.line} />
            </View>
            */}

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#777"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              accessibilityLabel="Email address"
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
                autoCapitalize="none"
                textContentType="password"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleEmailLogin}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setHidePassword(!hidePassword)}
                hitSlop={10}
                disabled={isLoading}
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

            {errorMessage ? (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {errorMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/auth/forgot-password",
                  params: { next: "customer" },
                })
              }
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleEmailLogin}
              activeOpacity={0.8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isEmailLoading }}
            >
              {isEmailLoading ? (
                <View style={styles.loginButtonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loginText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/user-register")}
              disabled={isLoading}
              accessibilityRole="link"
              accessibilityLabel="Are you a new user? Create an account"
            >
              <Text style={styles.newUser}>Are you a new user?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/barber-login")}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Barber login"
            >
              <Text style={styles.barberLogin}>Barber Login →</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing you agree to our{" "}
              <Text style={styles.link}>Terms</Text> &{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
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

  forgot: {
    color: "#F6A623",
    marginTop: 14,
    fontWeight: "700",
    alignSelf: "flex-end",
  },

  loginButton: {
    backgroundColor: "#F6A623",
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
  },

  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loginText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  newUser: {
    marginTop: 22,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 15,
  },

  barberLogin: {
    marginTop: 22,
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
