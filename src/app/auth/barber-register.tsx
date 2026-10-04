import { Redirect } from "expo-router";

/** Email barber registration removed — Google login + shop setup. */
export default function BarberRegisterRedirect() {
  return <Redirect href="/auth/barber-login" />;
}
