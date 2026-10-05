import { useSession } from "@/context/session-provider";
import { BarberHomeScreen } from "@/components/barber-home-screen";
import { CustomerHomeScreen } from "@/components/customer-home-screen";

export default function HomeScreen() {
  const { user } = useSession();

  if (user?.role === "BARBER") {
    return <BarberHomeScreen />;
  }

  return <CustomerHomeScreen />;
}
