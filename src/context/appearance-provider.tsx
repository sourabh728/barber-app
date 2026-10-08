import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import { useStorageState } from "@/hooks/use-storage-state";

export type AppearancePreference = "light" | "dark";

type AppearanceContextValue = {
  preference: AppearancePreference;
  isLoading: boolean;
  setPreference: (value: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

const STORAGE_KEY = "appearancePreference";

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [[isLoading, stored], setStored] = useStorageState(STORAGE_KEY);

  const preference: AppearancePreference =
    stored === "dark" ? "dark" : "light";

  const setPreference = useCallback(
    (value: AppearancePreference) => {
      setStored(value);
    },
    [setStored],
  );

  const value = useMemo(
    () => ({
      preference,
      isLoading,
      setPreference,
    }),
    [isLoading, preference, setPreference],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}

/** Safe read for hooks that may run outside the provider during boot. */
export function useAppearancePreference(): AppearancePreference {
  const context = useContext(AppearanceContext);
  return context?.preference ?? "light";
}
