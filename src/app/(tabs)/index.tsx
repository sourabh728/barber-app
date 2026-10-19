import { Redirect } from "expo-router";

import { BarberHomeScreen } from "@/components/barber-home-screen";
import { CustomerHomeScreen } from "@/components/customer-home-screen";
import { isPlatformAdminUser } from "@/constants/platform-admin";
import { useSession } from "@/context/session-provider";

export default function HomeScreen() {
  const { user } = useSession();

  if (isPlatformAdminUser(user)) {
    return <Redirect href="/admin" />;
  }

  if (user?.role === "BARBER") {
    return <BarberHomeScreen />;
  }

  return <CustomerHomeScreen />;
}
