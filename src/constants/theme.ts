/**
 * App color tokens for light (home-style) and dark (history/edit-profile style).
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    background: "#F3F4F6",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E7F3ED",
    backgroundCard: "#FFFFFF",
    backgroundMuted: "#F1F5F9",
    border: "#E5E7EB",
    primary: "#0B5A47",
    primaryText: "#FFFFFF",
    accent: "#F97316",
    accentText: "#111111",
    danger: "#DC2626",
    header: "#0B5A47",
    headerText: "#FFFFFF",
    statusBarStyle: "light" as const,
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#C9C9D6",
    background: "#09090F",
    backgroundElement: "#14141F",
    backgroundSelected: "#1A1A26",
    backgroundCard: "#14141F",
    backgroundMuted: "#1A1A26",
    border: "#2A2A3A",
    primary: "#F97316",
    primaryText: "#111111",
    accent: "#F97316",
    accentText: "#111111",
    danger: "#F87171",
    header: "#0C0C14",
    headerText: "#FFFFFF",
    statusBarStyle: "light" as const,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type AppColors = (typeof Colors)[keyof typeof Colors];

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
