import { Redirect } from "expo-router";

/** Password reset removed — Google-only auth. */
export default function ResetPasswordRedirect() {
  return <Redirect href="/auth" />;
}
