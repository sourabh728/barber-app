import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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

const SUPPORT_PHONE = "8458892295";
const SUPPORT_EMAIL = "solutionsfromyukti@gmail.com";

export default function HelpSupportScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callSupport = async () => {
    const url = `tel:${SUPPORT_PHONE}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Unable to call", `Please dial ${SUPPORT_PHONE} manually.`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to call", `Please dial ${SUPPORT_PHONE} manually.`);
    }
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedProblem = problem.trim();

    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please add a grievance title.");
      return;
    }
    if (!trimmedProblem) {
      Alert.alert("Missing details", "Please explain the problem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const role = user?.role ?? "CUSTOMER";
      const body = [
        trimmedProblem,
        "",
        "—",
        `From: ${user?.name ?? "User"} <${user?.email ?? "unknown"}>`,
        `Role: ${role}`,
        `Phone: ${user?.phone ?? "n/a"}`,
      ].join("\n");

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        `[Support] ${trimmedTitle}`,
      )}&body=${encodeURIComponent(body)}`;

      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
      }

      Alert.alert(
        "Thanks for reaching out",
        "We will try to solve your issue as soon as possible.",
        [
          {
            text: "OK",
            onPress: () => {
              setTitle("");
              setProblem("");
              router.back();
            },
          },
        ],
      );
    } catch {
      Alert.alert(
        "Could not open mail",
        `Please email us at ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.intro}>
              If you are experiencing any issues, please let us know. We will
              try to solve them as soon as possible.
            </Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Add your grievance title here"
              placeholderTextColor="#94A3B8"
              editable={!isSubmitting}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            <Text style={styles.label}>Explain the problem</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={problem}
              onChangeText={setProblem}
              placeholder="Type your query here"
              placeholderTextColor="#94A3B8"
              editable={!isSubmitting}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit support request"
            >
              <Text style={styles.submitText}>SUBMIT</Text>
            </TouchableOpacity>

            <Text style={styles.contactLine}>
              You can contact us on this number{" "}
              <Text style={styles.phoneLink} onPress={() => void callSupport()}>
                {SUPPORT_PHONE}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  flex: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 32,
    minHeight: 520,
  },

  intro: {
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  label: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 18,
  },

  multiline: {
    minHeight: 140,
    paddingTop: 12,
  },

  submitButton: {
    marginTop: 8,
    backgroundColor: "#335C67",
    borderRadius: 10,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  submitDisabled: {
    opacity: 0.7,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  contactLine: {
    marginTop: 28,
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },

  phoneLink: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
