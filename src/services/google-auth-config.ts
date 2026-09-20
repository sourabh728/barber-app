import Constants, { ExecutionEnvironment } from "expo-constants";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

export const APP_APPLICATION_ID = "com.barberapp1.app";

export function getGoogleAuthClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? "",
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? "",
  };
}

export function isGoogleAuthConfigured() {
  const { webClientId, iosClientId, androidClientId } =
    getGoogleAuthClientIds();

  return Boolean(webClientId || iosClientId || androidClientId);
}

export function isExpoGoRuntime() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function hasNativeGoogleClientId() {
  const { iosClientId, androidClientId } = getGoogleAuthClientIds();

  return Platform.OS === "ios" ? Boolean(iosClientId) : Boolean(androidClientId);
}

export function canPromptGoogleAuth() {
  if (!isGoogleAuthConfigured()) {
    return false;
  }

  if (Platform.OS === "web") {
    return Boolean(getGoogleAuthClientIds().webClientId);
  }

  // Expo Go cannot complete Google OAuth: Google rejects exp://, and the
  // auth.expo.io proxy is deprecated and fails to finish the redirect.
  if (isExpoGoRuntime()) {
    return false;
  }

  return hasNativeGoogleClientId();
}

export function getGoogleAuthUnavailableMessage() {
  if (isExpoGoRuntime()) {
    return "Google sign-in can't finish in Expo Go. Press w in the Expo terminal to continue in the browser, or run a development build with npx expo run:android.";
  }

  if (Platform.OS === "android") {
    return `Google sign-in on this Android build needs an Android OAuth client for package ${APP_APPLICATION_ID}. Until that's added, press w in the Expo terminal to sign in on web.`;
  }

  if (Platform.OS === "ios") {
    return `Google sign-in on this iOS build needs an iOS OAuth client for bundle ${APP_APPLICATION_ID}. Until that's added, press w in the Expo terminal to sign in on web.`;
  }

  return "Google sign-in isn't available in this runtime. Press w in the Expo terminal to continue in the browser.";
}

export function getGoogleAuthRedirectUri() {
  if (Platform.OS === "web") {
    return AuthSession.makeRedirectUri();
  }

  return AuthSession.makeRedirectUri({
    native: `${APP_APPLICATION_ID}:/oauthredirect`,
    scheme: APP_APPLICATION_ID,
    path: "oauthredirect",
  });
}
