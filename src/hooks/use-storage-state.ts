import { useCallback, useEffect, useReducer } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): UseStateHook<T> {
  return useReducer(
    (_state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [
      false,
      action,
    ],
    initialValue,
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === "web") {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error("Local storage is unavailable:", error);
    }
    return;
  }

  if (value == null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

type UseStorageStateOptions = {
  /** When false, skip reading a persisted value on mount (session starts null). Writes still persist. */
  restore?: boolean;
};

export function useStorageState(
  key: string,
  options?: UseStorageStateOptions,
): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();
  const restore = options?.restore !== false;

  useEffect(() => {
    // Intentionally skip restore so each app launch requires login again.
    // Helpers remain for in-session signIn/signOut persistence and future use.
    if (!restore) {
      setState(null);
      return;
    }

    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          setState(localStorage.getItem(key));
        } else {
          setState(null);
        }
      } catch (error) {
        console.error("Local storage is unavailable:", error);
        setState(null);
      }
      return;
    }

    const timeoutMs = 3_000;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setState(null);
      }
    }, timeoutMs);

    SecureStore.getItemAsync(key)
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          setState(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          setState(null);
        }
      });

    return () => {
      settled = true;
      clearTimeout(timer);
    };
  }, [key, restore, setState]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      void setStorageItemAsync(key, value);
    },
    [key, setState],
  );

  return [state, setValue];
}
