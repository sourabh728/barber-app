import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useAppearance,
  type AppearancePreference,
} from "@/context/appearance-provider";
import { useTheme } from "@/hooks/use-theme";

const OPTIONS: {
  value: AppearancePreference;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "light",
    title: "Light",
    subtitle: "Bright home-style screens",
    icon: "sunny-outline",
  },
  {
    value: "dark",
    title: "Dark",
    subtitle: "Dim look like History & Edit Profile",
    icon: "moon-outline",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { preference, setPreference } = useAppearance();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.backgroundCard,
              },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.heading, { color: colors.text }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Appearance
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Choose how Trimshim looks. Light is the default.
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          {OPTIONS.map((option, index) => {
            const selected = preference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  index < OPTIONS.length - 1
                    ? {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      }
                    : null,
                ]}
                onPress={() => setPreference(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.title} appearance`}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor: selected
                        ? colors.backgroundSelected
                        : colors.backgroundMuted,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {option.subtitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selected ? (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionSubtitle: {
    fontSize: 13,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
