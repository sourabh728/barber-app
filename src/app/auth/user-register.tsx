import { Redirect } from "expo-router";

/** Email registration removed — Google-only auth. */
export default function UserRegisterRedirect() {
  return <Redirect href="/auth" />;
}
