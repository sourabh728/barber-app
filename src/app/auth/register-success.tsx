import { Redirect } from "expo-router";

/** Registration success removed — Google-only auth. */
export default function RegisterSuccessRedirect() {
  return <Redirect href="/auth" />;
}
