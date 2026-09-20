import type { AuthSessionResult } from "expo-auth-session";
import { isAxiosError } from "axios";
import { Platform } from "react-native";

const PLAY_SERVICES_MESSAGE =
  "Google Play services isn't responding on this device. Use a Play Store emulator image, wait for Play services to finish updating, or press w in the Expo terminal to sign in on web.";

function errorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

function messageFromResponseData(data: unknown, fallback: string) {
  const message = (data as { message?: unknown } | undefined)?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    const joined = message.filter(Boolean).join(" ");
    return joined || fallback;
  }

  return fallback;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Invalid email or password.";
  }

  if (error.response.status === 400) {
    return "Enter a valid email address and password.";
  }

  return messageFromResponseData(error.response.data, fallback);
}

export function getLoginErrorMessage(error: unknown) {
  return getAuthErrorMessage(error, "Login failed. Please try again.");
}

export function getRegisterErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 409) {
    return messageFromResponseData(
      error.response.data,
      "An account with this email or phone already exists.",
    );
  }

  if (isAxiosError(error) && error.response?.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check your name, email, and password (at least 6 characters).",
    );
  }

  return getAuthErrorMessage(
    error,
    "Registration failed. Please try again.",
  );
}

export function getUpdateProfileErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 409) {
    return messageFromResponseData(
      error.response.data,
      "Email or phone is already in use.",
    );
  }

  if (isAxiosError(error) && error.response?.status === 403) {
    return messageFromResponseData(
      error.response.data,
      "You are not allowed to update this profile.",
    );
  }

  if (isAxiosError(error) && error.response?.status === 404) {
    return messageFromResponseData(
      error.response.data,
      "Shop not found. Complete shop setup first.",
    );
  }

  if (isAxiosError(error) && error.response?.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Check your details and try again. Password must be at least 6 characters.",
    );
  }

  return getAuthErrorMessage(
    error,
    "Could not update profile. Please try again.",
  );
}

export function getGoogleLoginErrorMessage(error: unknown) {
  const raw = errorText(error);

  if (/cancel(led)?|dismiss/i.test(raw)) {
    return "";
  }

  if (
    /play services/i.test(raw) ||
    /PLAY_SERVICES_NOT_AVAILABLE/i.test(raw) ||
    /GooglePlayServices/i.test(raw)
  ) {
    return PLAY_SERVICES_MESSAGE;
  }

  if (isAxiosError(error) && error.response?.status === 503) {
    return "Google Sign-In is not configured. Add Google client IDs to continue.";
  }

  if (isAxiosError(error) && error.response?.status === 401) {
    return messageFromResponseData(
      error.response.data,
      "Google sign-in failed. Please try again.",
    );
  }

  if (isAxiosError(error) && error.response?.status === 400) {
    return messageFromResponseData(
      error.response.data,
      "Google sign-in request was invalid.",
    );
  }

  return getAuthErrorMessage(
    error,
    "Google sign-in failed. Please try again.",
  );
}

export function getGoogleAuthSessionErrorMessage(
  result: AuthSessionResult,
  redirectUri: string,
) {
  if (result.type === "cancel" || result.type === "dismiss") {
    return null;
  }

  if (result.type !== "error" && result.type !== "success") {
    return "Google sign-in did not complete. Please try again.";
  }

  if (result.type === "success") {
    return null;
  }

  const errorCode = (
    result.params.error ||
    result.errorCode ||
    result.error?.code ||
    ""
  ).toLowerCase();
  const description =
    result.params.error_description || result.error?.message || "";

  if (errorCode === "access_denied") {
    return "Google sign-in was denied.";
  }

  if (
    errorCode.includes("redirect_uri") ||
    description.toLowerCase().includes("redirect_uri")
  ) {
    if (Platform.OS === "web") {
      return `Google rejected this redirect URI. Add it to the Web client in Google Cloud Console: ${redirectUri}`;
    }

    return `Google rejected this redirect URI (${redirectUri}). For a development build, the Android/iOS OAuth client package/bundle must be com.barberapp1.app.`;
  }

  if (description.trim()) {
    return description;
  }

  if (errorCode) {
    return `Google sign-in failed (${errorCode}). Please try again.`;
  }

  return "Google sign-in failed. Please try again.";
}
