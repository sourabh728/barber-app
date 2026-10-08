import { useAppearancePreference } from "@/context/appearance-provider";

/**
 * App appearance preference (Settings → Appearance).
 * Defaults to light; ignores the OS scheme so the in-app toggle is authoritative.
 */
export function useColorScheme(): "light" | "dark" {
  return useAppearancePreference();
}
