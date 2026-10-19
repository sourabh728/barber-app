import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider,
  usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MaintenanceGate } from "@/components/maintenance-gate";
import { isPlatformAdminUser } from "@/constants/platform-admin";
import {
  AppearanceProvider,
  useAppearancePreference,
} from "@/context/appearance-provider";
import { SessionProvider, useSession } from "@/context/session-provider";

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

function ThemedApp() {
  const colorScheme = useAppearancePreference();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="light" />
      <MaintenanceGate>
        <RootNavigator />
      </MaintenanceGate>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <SessionProvider>
          <SplashScreenController />
          <ThemedApp />
        </SessionProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

function SessionRedirects() {
  const { session, user, isLoading } = useSession();
  const pathname = usePathname();
  const isAdmin = isPlatformAdminUser(user);

  if (isLoading) {
    return null;
  }

  if (!session && !pathname.startsWith("/auth")) {
    return <Redirect href="/auth" />;
  }

  if (session && isAdmin && !pathname.startsWith("/admin")) {
    return <Redirect href="/admin" />;
  }

  if (
    session &&
    !isAdmin &&
    (pathname.startsWith("/admin") || pathname.startsWith("/auth"))
  ) {
    return <Redirect href="/" />;
  }

  return null;
}

function RootNavigator() {
  const { session, user, isLoading } = useSession();
  const isBarber = user?.role === "BARBER";
  const isAdmin = isPlatformAdminUser(user);

  if (session && (isLoading || !user)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EAF6F1",
        }}
      >
        <ActivityIndicator color="#0B5A47" size="large" />
      </View>
    );
  }

  return (
    <>
      <SessionRedirects />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="auth" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && isAdmin}>
          <Stack.Screen name="admin" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && !isAdmin}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help-support" />
          <Stack.Screen name="payment-methods" />
          <Stack.Screen name="history/index" />
          <Stack.Screen name="history/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="scan-shop-qr" />
          <Stack.Screen name="service-start-qr" />
          <Stack.Screen name="shop/[id]/index" />
          <Stack.Screen name="shop/[id]/reviews" />
        </Stack.Protected>

        <Stack.Protected guard={!!session && isBarber && !isAdmin}>
          <Stack.Screen name="barber" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
