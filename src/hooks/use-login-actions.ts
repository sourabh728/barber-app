import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { useSession } from "@/context/session-provider";
import {
  fetchCurrentUser,
  loginWithGoogleIdToken,
  sessionUserFromLogin,
  type GoogleLoginRole,
} from "@/services/auth-api";
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

const GOOGLE_NOT_CONFIGURED =
  "Google Sign-In is not configured. Add Google client IDs to continue.";

type UseLoginActionsOptions = {
  role?: GoogleLoginRole;
};

export function useLoginActions(options: UseLoginActionsOptions = {}) {
  const router = useRouter();
  const { signIn } = useSession();
  const intendedRole = options.role ?? "CUSTOMER";

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  const isLoading = isGoogleLoading;

  useEffect(() => {
    if (Platform.OS !== "android" || expoGo) {
      return;
    }

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, [expoGo]);

  async function handleGoogleLogin() {
    if (isSubmitting.current || isLoading) {
      return;
    }

    setErrorMessage("");

    if (!googleConfigured) {
      setErrorMessage(GOOGLE_NOT_CONFIGURED);
      return;
    }

    if (!googlePromptAllowed) {
      setErrorMessage(getGoogleAuthUnavailableMessage());
      return;
    }

    if (!request) {
      setErrorMessage(
        "Google Sign-In is still starting. Try again in a moment.",
      );
      return;
    }

    isSubmitting.current = true;
    setIsGoogleLoading(true);

    try {
      const result = await promptAsync();

      if (!result || result.type === "cancel" || result.type === "dismiss") {
        return;
      }

      const redirectUri = request.redirectUri || googleRedirectUri;

      if (result.type !== "success") {
        setErrorMessage(
          getGoogleAuthSessionErrorMessage(result, redirectUri) ??
            "Google sign-in failed. Please try again.",
        );
        return;
      }

      const idToken =
        result.params.id_token ?? result.authentication?.idToken;

      if (!idToken) {
        setErrorMessage(
          Platform.OS === "web"
            ? `Google sign-in did not return an ID token. Confirm this redirect URI is on the Web client in Google Cloud Console: ${redirectUri}`
            : `Google sign-in did not return an ID token. Confirm the ${Platform.OS === "ios" ? "iOS" : "Android"} OAuth client uses package/bundle ${redirectUri.split(":")[0] || "com.barberapp1.app"} and that client ID is in the backend GOOGLE_CLIENT_IDS list.`,
        );
        return;
      }

      const data = await loginWithGoogleIdToken(idToken, intendedRole);
      await signIn(data.accessToken, sessionUserFromLogin(data.user));

      if (data.user.role === "BARBER") {
        try {
          const profile = await fetchCurrentUser();
          if (!profile.shop) {
            router.replace("/barber/shop-setup");
            return;
          }
        } catch {
          // Continue to barber home if profile check fails.
        }
        router.replace("/profile");
        return;
      }

      router.replace("/");
    } catch (error: unknown) {
      const message = getGoogleLoginErrorMessage(error);

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      isSubmitting.current = false;
      setIsGoogleLoading(false);
    }
  }

  return {
    isLoading,
    isGoogleLoading,
    errorMessage,
    googleRequestReady:
      !googleConfigured || !googlePromptAllowed || Boolean(request),
    handleGoogleLogin,
  };
}
