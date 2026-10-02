import { create } from "axios";
import { Platform } from "react-native";

/**
 * Production API is hosted on Render. Local Nest is optional for developers.
 * Android emulator cannot reach a host Nest via localhost/127.0.0.1 — use 10.0.2.2.
 */
const RENDER_API_URL = "https://barber-app-hmy9.onrender.com";

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const url = configured || RENDER_API_URL;

  if (Platform.OS !== "android") {
    return url.replace(/\/$/, "");
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = "10.0.2.2";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through with the configured string.
  }

  return url.replace(/\/$/, "");
}

export const apiBaseUrl = resolveApiBaseUrl();

/** Render free tier can take 30–60s to wake; keep client timeout above that. */
const isRemoteApi = /^https?:\/\//i.test(apiBaseUrl) && !/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(apiBaseUrl);

export const api = create({
  baseURL: apiBaseUrl,
  timeout: isRemoteApi ? 60_000 : 15_000,
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
    photoUrl?: string | null;
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
