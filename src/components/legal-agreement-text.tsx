import { useRouter } from "expo-router";
import { Linking, StyleSheet, Text, type TextStyle } from "react-native";

import { PRIVACY_POLICY_URL } from "@/constants/legal";

type Props = {
  style?: TextStyle;
  linkStyle?: TextStyle;
};

async function openPrivacy() {
  try {
    const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
    if (canOpen) {
      await Linking.openURL(PRIVACY_POLICY_URL);
    }
  } catch {
    // Ignore — user can open the URL from Play listing if needed.
  }
}

export function LegalAgreementText({ style, linkStyle }: Props) {
  const router = useRouter();

  return (
    <Text style={[styles.terms, style]}>
      By continuing, you agree to our{" "}
      <Text
        style={[styles.link, linkStyle]}
        onPress={() => router.push("/auth/terms")}
        accessibilityRole="link"
        accessibilityLabel="Terms of Service"
      >
        Terms
      </Text>{" "}
      &{" "}
      <Text
        style={[styles.link, linkStyle]}
        onPress={() => {
          void openPrivacy();
        }}
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
      >
        Privacy Policy
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  terms: {
    color: "#8B8BA7",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  link: {
    color: "#F97316",
    fontWeight: "600",
  },
});
