import { Redirect } from "expo-router";

/** Password reset removed — Google-only auth. */
export default function ForgotPasswordRedirect() {
  return <Redirect href="/auth" />;
}
