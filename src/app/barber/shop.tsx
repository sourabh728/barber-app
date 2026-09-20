import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/context/session-provider";

export default function BarberShopPlaceholderScreen() {
  const { signOut } = useSession();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Register or update your shop</Text>
        <Text style={styles.message}>
          This page is a placeholder. Shop details will be added later.
        </Text>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            void signOut();
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090F",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  message: {
    color: "#8B8BA7",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 12,
  },

  signOutButton: {
    marginTop: 36,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F6A623",
    alignItems: "center",
    justifyContent: "center",
  },

  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});
