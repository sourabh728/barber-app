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
import { emailFromIdToken } from "@/services/google-id-token";
import {
  getNativeGoogleSignInErrorMessage,
  promptNativeGoogleIdToken,
  supportsNativeGoogleSignIn,
} from "@/services/google-native-sign-in";

WebBrowser.maybeCompleteAuthSession();

export type GoogleIdentity = {
  idToken: string;
  email: string;
  name?: string;
};

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
  const useNativeGoogle = supportsNativeGoogleSignIn() && !expoGo;

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId || iosClientId || androidClientId,
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
    selectAccount: true,
    ...(!useNativeGoogle && googlePromptAllowed && Platform.OS !== "web"
      ? { redirectUri: googleRedirectUri }
      : {}),
  });

  useEffect(() => {
    if (useNativeGoogle || Platform.OS !== "android" || expoGo) {
      return;
    }

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, [expoGo, useNativeGoogle]);

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

    isSubmitting.current = true;
    setIsGoogleLoading(true);

    try {
      let idToken: string | null = null;

      if (useNativeGoogle) {
        idToken = await promptNativeGoogleIdToken();
        if (!idToken) {
          return null;
        }
      } else {
        if (!request) {
          setErrorMessage(
            "Google Sign-In is still starting. Try again in a moment.",
          );
          return null;
        }

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

        idToken =
          result.params.id_token ?? result.authentication?.idToken ?? null;

        if (!idToken) {
          setErrorMessage(
            "Google sign-in did not return an ID token. Please try again.",
          );
          return null;
        }
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
      const nativeMessage = getNativeGoogleSignInErrorMessage(error);
      const message = nativeMessage ?? getGoogleLoginErrorMessage(error);
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
      !googleConfigured ||
      !googlePromptAllowed ||
      useNativeGoogle ||
      Boolean(request),
    continueWithGoogle,
  };
}
