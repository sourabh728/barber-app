import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { getGoogleAuthClientIds } from "@/services/google-auth-config";

let configured = false;

function ensureConfigured() {
  if (configured) {
    return;
  }

  const { webClientId, iosClientId } = getGoogleAuthClientIds();

  GoogleSignin.configure({
    // Required on Android to receive an ID token the backend can verify.
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });

  configured = true;
}

export function supportsNativeGoogleSignIn() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export async function promptNativeGoogleIdToken(): Promise<string | null> {
  ensureConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  const idToken = response.data.idToken;

  if (idToken) {
    return idToken;
  }

  const tokens = await GoogleSignin.getTokens();
  return tokens.idToken || null;
}

export function getNativeGoogleSignInErrorMessage(error: unknown): string | null {
  if (!isErrorWithCode(error)) {
    return null;
  }

  switch (error.code) {
    case statusCodes.SIGN_IN_CANCELLED:
    case statusCodes.IN_PROGRESS:
      return null;
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return "Google Play services is missing or outdated on this device.";
    default:
      return error.message || "Google sign-in failed. Please try again.";
  }
}
