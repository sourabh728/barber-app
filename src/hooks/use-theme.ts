/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type AppColors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useTheme(): AppColors {
  const scheme = useColorScheme();
  return Colors[scheme];
}

export function useThemeScheme(): "light" | "dark" {
  return useColorScheme();
}
