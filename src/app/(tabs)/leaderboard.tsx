import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShopLeaderboardView } from "@/components/shop-leaderboard";
import { useTheme } from "@/hooks/use-theme";

export default function LeaderboardTab() {
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ShopLeaderboardView />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: "center", marginTop: 8, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  scrollContent: { paddingBottom: 32 },
});
