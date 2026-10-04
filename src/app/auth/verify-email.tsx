import { Redirect } from "expo-router";

/** Email OTP verification removed — Google-only auth. */
export default function VerifyEmailRedirect() {
  return <Redirect href="/auth" />;
}
