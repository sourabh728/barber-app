import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import {
  getGoogleAuthSessionErrorMessage,
  getGoogleLoginErrorMessage,
} from "@/services/auth-errors";
import {
  canPromptGoogleAuth,
  getGoogleAuthClientIds,
  getGoogleAuthRedirectUri,
  getGoogleAuthUnavailableMessage,
  isExpoGoRuntime,
  isGoogleAuthConfigured,
} from "@/services/google-auth-config";

WebBrowser.maybeCompleteAuthSession();

export type GoogleIdentity = {
  idToken: string;
  email: string;
  name?: string;
};

function emailFromIdToken(idToken: string): { email?: string; name?: string } {
  try {
    const payloadPart = idToken.split(".")[1];
    if (!payloadPart) {
      return {};
    }

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    if (typeof globalThis.atob !== "function") {
      return {};
    }

    const json = globalThis.atob(padded);

    const payload = JSON.parse(json) as {
      email?: string;
      name?: string;
      email_verified?: boolean | string;
    };

    const verified =
      payload.email_verified === true || payload.email_verified === "true";

    if (!payload.email || !verified) {
      return {};
    }

    return {
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export function useGoogleIdentity() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [identity, setIdentity] = useState<GoogleIdentity | null>(null);
  const isSubmitting = useRef(false);

  const googleConfigured = isGoogleAuthConfigured();
  const { webClientId, iosClientId, androidClientId } =
    getGoogleAuthClientIds();
  const googleRedirectUri = getGoogleAuthRedirectUri();
  const googlePromptAllowed = canPromptGoogleAuth();
  const expoGo = isExpoGoRuntime();

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId || iosClientId || androidClientId,
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
    selectAccount: true,
    ...(googlePromptAllowed && Platform.OS !== "web"
      ? { redirectUri: googleRedirectUri }
      : {}),
  });

  useEffect(() => {
    if (Platform.OS !== "android" || expoGo) {
      return;
    }

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, [expoGo]);

  async function continueWithGoogle(): Promise<GoogleIdentity | null> {
    if (isSubmitting.current || isGoogleLoading) {
      return null;
    }

    setErrorMessage("");

    if (!googleConfigured) {
      setErrorMessage(
        "Google Sign-In is not configured. Add Google client IDs to continue.",
      );
      return null;
    }

    if (!googlePromptAllowed) {
      setErrorMessage(getGoogleAuthUnavailableMessage());
      return null;
    }

    if (!request) {
      setErrorMessage(
        "Google Sign-In is still starting. Try again in a moment.",
      );
      return null;
    }

    isSubmitting.current = true;
    setIsGoogleLoading(true);

    try {
      const result = await promptAsync();

      if (!result || result.type === "cancel" || result.type === "dismiss") {
        return null;
      }

      const redirectUri = request.redirectUri || googleRedirectUri;

      if (result.type !== "success") {
        setErrorMessage(
          getGoogleAuthSessionErrorMessage(result, redirectUri) ??
            "Google sign-in failed. Please try again.",
        );
        return null;
      }

      const idToken =
        result.params.id_token ?? result.authentication?.idToken;

      if (!idToken) {
        setErrorMessage(
          "Google sign-in did not return an ID token. Please try again.",
        );
        return null;
      }

      const { email, name } = emailFromIdToken(idToken);

      if (!email) {
        setErrorMessage(
          "Google account email is not verified. Use a verified Google account.",
        );
        return null;
      }

      const nextIdentity = { idToken, email, name };
      setIdentity(nextIdentity);
      return nextIdentity;
    } catch (error: unknown) {
      const message = getGoogleLoginErrorMessage(error);
      if (message) {
        setErrorMessage(message);
      }
      return null;
    } finally {
      isSubmitting.current = false;
      setIsGoogleLoading(false);
    }
  }

  return {
    identity,
    setIdentity,
    isGoogleLoading,
    errorMessage,
    setErrorMessage,
    googleRequestReady:
      !googleConfigured || !googlePromptAllowed || Boolean(request),
    continueWithGoogle,
  };
}
