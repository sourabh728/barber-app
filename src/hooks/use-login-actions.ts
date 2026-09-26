import { useRef, useState } from "react";
import { useRouter } from "expo-router";
// Google login is unused while the app uses email/password JWT.
// import { useEffect, useRef, useState } from "react";
// import { Platform } from "react-native";
// import { useRouter } from "expo-router";
// import { ResponseType } from "expo-auth-session";
// import * as Google from "expo-auth-session/providers/google";
// import * as WebBrowser from "expo-web-browser";

import { useSession } from "@/context/session-provider";
import {
  loginWithEmail,
  // loginWithGoogleIdToken,
  sessionUserFromLogin,
  type GoogleLoginRole,
} from "@/services/auth-api";
import {
  // getGoogleAuthSessionErrorMessage,
  // getGoogleLoginErrorMessage,
  getEmailNotVerifiedPayload,
  getLoginErrorMessage,
} from "@/services/auth-errors";
// import {
//   canPromptGoogleAuth,
//   getGoogleAuthClientIds,
//   getGoogleAuthRedirectUri,
//   getGoogleAuthUnavailableMessage,
//   isExpoGoRuntime,
//   isGoogleAuthConfigured,
// } from "@/services/google-auth-config";

// WebBrowser.maybeCompleteAuthSession();

// const GOOGLE_NOT_CONFIGURED =
//   "Google Sign-In is not configured. Add Google client IDs to continue.";

type UseLoginActionsOptions = {
  role?: GoogleLoginRole;
};

export function useLoginActions(options: UseLoginActionsOptions = {}) {
  const router = useRouter();
  const { signIn } = useSession();
  // Used by Google login when restored; kept so callers can still pass role.
  const intendedRole = options.role ?? "CUSTOMER";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  // const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isSubmitting = useRef(false);

  // Google auth request path kept for easy restore; unused from UI.
  // const googleConfigured = isGoogleAuthConfigured();
  // const { webClientId, iosClientId, androidClientId } =
  //   getGoogleAuthClientIds();
  // const googleRedirectUri = getGoogleAuthRedirectUri();
  // const googlePromptAllowed = canPromptGoogleAuth();
  // const expoGo = isExpoGoRuntime();
  //
  // const [request, , promptAsync] = Google.useAuthRequest({
  //   clientId: webClientId || iosClientId || androidClientId,
  //   webClientId: webClientId || undefined,
  //   iosClientId: iosClientId || undefined,
  //   androidClientId: androidClientId || undefined,
  //   selectAccount: true,
  //   // Web uses the implicit ID token flow so the app never needs a client secret.
  //   // Native development/production builds use the default authorization-code
  //   // exchange, which Google allows for iOS/Android clients without a secret.
  //   ...(Platform.OS === "web"
  //     ? { responseType: ResponseType.IdToken }
  //     : {}),
  //   ...(googlePromptAllowed && Platform.OS !== "web"
  //     ? { redirectUri: googleRedirectUri }
  //     : {}),
  // });

  const isLoading = isEmailLoading;

  // useEffect(() => {
  //   if (Platform.OS !== "android" || expoGo) {
  //     return;
  //   }
  //
  //   void WebBrowser.warmUpAsync();
  //
  //   return () => {
  //     void WebBrowser.coolDownAsync();
  //   };
  // }, [expoGo]);

  async function handleEmailLogin() {
    if (isSubmitting.current) {
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
      await signIn(data.accessToken, sessionUserFromLogin(data.user));
      router.replace(
        data.user.role === "BARBER" ? "/profile" : "/",
      );
    } catch (error: unknown) {
      const unverified = getEmailNotVerifiedPayload(error);
      if (unverified) {
        router.push({
          pathname: "/auth/verify-email",
          params: {
            email: unverified.email,
            next: intendedRole === "BARBER" ? "barber" : "customer",
          },
        });
        return;
      }
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      isSubmitting.current = false;
      setIsEmailLoading(false);
    }
  }

  // async function handleGoogleLogin() {
  //   if (isSubmitting.current || isLoading) {
  //     return;
  //   }
  //
  //   setErrorMessage("");
  //
  //   if (!googleConfigured) {
  //     setErrorMessage(GOOGLE_NOT_CONFIGURED);
  //     return;
  //   }
  //
  //   if (!googlePromptAllowed) {
  //     setErrorMessage(getGoogleAuthUnavailableMessage());
  //     return;
  //   }
  //
  //   if (!request) {
  //     setErrorMessage(
  //       "Google Sign-In is still starting. Try again in a moment.",
  //     );
  //     return;
  //   }
  //
  //   isSubmitting.current = true;
  //   setIsGoogleLoading(true);
  //
  //   try {
  //     const result = await promptAsync();
  //
  //     if (!result || result.type === "cancel" || result.type === "dismiss") {
  //       return;
  //     }
  //
  //     const redirectUri = request.redirectUri || googleRedirectUri;
  //
  //     if (result.type !== "success") {
  //       setErrorMessage(
  //         getGoogleAuthSessionErrorMessage(result, redirectUri) ??
  //           "Google sign-in failed. Please try again.",
  //       );
  //       return;
  //     }
  //
  //     const idToken =
  //       result.params.id_token ?? result.authentication?.idToken;
  //
  //     if (!idToken) {
  //       setErrorMessage(
  //         Platform.OS === "web"
  //           ? `Google sign-in did not return an ID token. Confirm this redirect URI is on the Web client in Google Cloud Console: ${redirectUri}`
  //           : `Google sign-in did not return an ID token. Confirm the ${Platform.OS === "ios" ? "iOS" : "Android"} OAuth client uses package/bundle ${redirectUri.split(":")[0] || "com.barberapp1.app"} and that client ID is in the backend GOOGLE_CLIENT_IDS list.`,
  //       );
  //       return;
  //     }
  //
  //     const data = await loginWithGoogleIdToken(idToken, intendedRole);
  //     await signIn(data.accessToken, sessionUserFromLogin(data.user));
  //     router.replace(
  //       data.user.role === "BARBER" ? "/profile" : "/",
  //     );
  //   } catch (error: unknown) {
  //     const message = getGoogleLoginErrorMessage(error);
  //
  //     if (message) {
  //       setErrorMessage(message);
  //     }
  //   } finally {
  //     isSubmitting.current = false;
  //     setIsGoogleLoading(false);
  //   }
  // }

  return {
    email,
    setEmail,
    password,
    setPassword,
    hidePassword,
    setHidePassword,
    isLoading,
    isEmailLoading,
    // isGoogleLoading,
    errorMessage,
    // googleRequestReady:
    //   !googleConfigured || !googlePromptAllowed || Boolean(request),
    handleEmailLogin,
    // handleGoogleLogin,
  };
}
