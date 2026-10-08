import { useEffect, useState } from "react";

import { useAppearancePreference } from "@/context/appearance-provider";

/**
 * Web + static render: prefer light until hydrated, then the saved preference.
 */
export function useColorScheme(): "light" | "dark" {
  const [hasHydrated, setHasHydrated] = useState(false);
  const preference = useAppearancePreference();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return "light";
  }

  return preference;
}
