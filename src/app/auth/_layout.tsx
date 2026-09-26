import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="user-register" />
      <Stack.Screen name="register-success" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="barber-login" />
      <Stack.Screen name="barber-register" />
    </Stack>
  );
}
