import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "shop",
};

export default function BarberLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
