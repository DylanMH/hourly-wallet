import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { processAutopayBills } from "@/features/bills/billService";
import { useActiveShift } from "@/features/clock/useActiveShift";
import { useClockedInNotification } from "@/features/clock/useClockedInNotification";
import { bootstrapApp } from "@/features/settings/settingsService";
import { toDateKey } from "@/lib/dates";
import { initSentry } from "@/lib/sentry";
import { useAppStore } from "@/state/appStore";
import { useTheme } from "@/theme/useTheme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  const lastDateKey = useRef(toDateKey(new Date()));

  // Global notification lifecycle — ensures the foreground-service notification
  // is restored on app restart and foreground, regardless of which tab is active.
  const { shift, status } = useActiveShift();
  useClockedInNotification(shift, status);

  useEffect(() => {
    initSentry();
    bootstrapApp()
      .catch((error) => {
        console.error("Failed to bootstrap app", error);
        useAppStore.getState().setHydrated(true);
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  // Re-run autopay when the app returns to the foreground or the date changes.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state !== "active") return;
        const todayKey = toDateKey(new Date());
        const dateChanged = todayKey !== lastDateKey.current;
        lastDateKey.current = todayKey;
        processAutopayBills().catch(() => {});
        if (dateChanged) {
          useAppStore.getState().bumpBills();
          useAppStore.getState().bumpShifts();
        }
      },
    );
    return () => subscription.remove();
  }, []);

  if (!hydrated) {
    return null;
  }

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: colors.background },
      }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: colors.background },
      };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
