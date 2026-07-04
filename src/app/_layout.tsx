import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { processAutopayBills } from '@/features/bills/billService';
import { bootstrapApp } from '@/features/settings/settingsService';
import { toDateKey } from '@/lib/dates';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  const lastDateKey = useRef(toDateKey(new Date()));

  useEffect(() => {
    bootstrapApp()
      .catch((error) => {
        console.error('Failed to bootstrap app', error);
        useAppStore.getState().setHydrated(true);
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  // Re-run autopay when the app returns to the foreground or the date changes.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      const todayKey = toDateKey(new Date());
      const dateChanged = todayKey !== lastDateKey.current;
      lastDateKey.current = todayKey;
      processAutopayBills().catch(() => {});
      if (dateChanged) {
        useAppStore.getState().bumpBills();
        useAppStore.getState().bumpShifts();
      }
    });
    return () => subscription.remove();
  }, []);

  if (!hydrated) {
    return null;
  }

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
