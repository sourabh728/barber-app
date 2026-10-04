import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { useSession } from "@/context/session-provider";
import {
  fetchCurrentUser,
  loginWithEmail,
  loginWithGoogleIdToken,
  sessionUserFromLogin,
  type GoogleLoginRole,
} from "@/services/auth-api";
import {
  getGoogleAuthSessionErrorMessage,
  getGoogleLoginErrorMessage,
  getLoginErrorMessage,
} from "@/services/auth-errors";
import {
  canPromptGoogleAuth,
  getGoogleAuthClientIds,
  getGoogleAuthRedirectUri,
  getGoogleAuthUnavailableMessage,
  isExpoGoRuntime,
  isGoogleAuthConfigured,
} from "@/services/google-auth-config";
import {
  getNativeGoogleSignInErrorMessage,
  promptNativeGoogleIdToken,
  supportsNativeGoogleSignIn,
} from "@/services/google-native-sign-in";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
    ...(googlePromptAllowed && Platform.OS === "web"
      ? {}
      : !useNativeGoogle && googlePromptAllowed
        ? { redirectUri: googleRedirectUri }
        : {}),
  });

  const isLoading = isEmailLoading || isGoogleLoading;

  useEffect(() => {
    if (useNativeGoogle || Platform.OS !== "android" || expoGo) {
      return;
    }

    void WebBrowser.warmUpAsync();

    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, [expoGo, useNativeGoogle]);

  async function completeLogin(
    accessToken: string,
    user: Parameters<typeof sessionUserFromLogin>[0],
  ) {
    await signIn(accessToken, sessionUserFromLogin(user));

    if (user.role === "BARBER") {
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
  }

  async function handleEmailLogin() {
    if (isSubmitting.current || isLoading) {
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setErrorMessage("Enter your email address and password.");
      return;
    }

    isSubmitting.current = true;
    setIsEmailLoading(true);
    setErrorMessage("");

    try {
      const data = await loginWithEmail(normalizedEmail, password);
      await completeLogin(data.accessToken, data.user);
    } catch (error: unknown) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      isSubmitting.current = false;
      setIsEmailLoading(false);
    }
  }

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

    isSubmitting.current = true;
    setIsGoogleLoading(true);

    try {
      let idToken: string | null = null;

      if (useNativeGoogle) {
        idToken = await promptNativeGoogleIdToken();
        if (!idToken) {
          return;
        }
      } else {
        if (!request) {
          setErrorMessage(
            "Google Sign-In is still starting. Try again in a moment.",
          );
          return;
        }

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

        idToken =
          result.params.id_token ?? result.authentication?.idToken ?? null;

        if (!idToken) {
          setErrorMessage(
            `Google sign-in did not return an ID token. Confirm this redirect URI is on the Web client in Google Cloud Console: ${redirectUri}`,
          );
          return;
        }
      }

      const data = await loginWithGoogleIdToken(idToken, intendedRole);
      await completeLogin(data.accessToken, data.user);
    } catch (error: unknown) {
      const nativeMessage = getNativeGoogleSignInErrorMessage(error);
      const message = nativeMessage ?? getGoogleLoginErrorMessage(error);

      if (message) {
        setErrorMessage(message);
      }
    } finally {
      isSubmitting.current = false;
      setIsGoogleLoading(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    hidePassword,
    setHidePassword,
    isLoading,
    isEmailLoading,
    isGoogleLoading,
    errorMessage,
    googleRequestReady:
      !googleConfigured ||
      !googlePromptAllowed ||
      useNativeGoogle ||
      Boolean(request),
    handleEmailLogin,
    handleGoogleLogin,
  };
}
