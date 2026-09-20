import { create } from "axios";
import { Platform } from "react-native";

/**
 * Android emulator cannot reach the host via localhost/127.0.0.1 — use 10.0.2.2.
 * Do not use String.replace("$110.0.2.2"): some JS engines treat $11 as capture
 * group 11 and produce a broken URL (e.g. "0.0.2.2:3000"), which axios surfaces
 * as a network error → "Unable to reach the server".
 * Physical devices still need a LAN IP in EXPO_PUBLIC_API_URL (adb reverse also works).
 */
function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fallback =
    Platform.OS === "android"
      ? "http://10.0.2.2:3000"
      : "http://localhost:3000";
  const url = configured || fallback;

  if (Platform.OS !== "android") {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = "10.0.2.2";
      // URL#toString keeps a trailing slash for origin-only URLs; axios joins paths better without it.
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through with the configured/fallback string.
  }

  return url;
}

export const apiBaseUrl = resolveApiBaseUrl();

export const api = create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
};

export function setApiAccessToken(accessToken: string) {
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export function clearApiAccessToken() {
  delete api.defaults.headers.common.Authorization;
}
