import { create } from 'zustand';

import type { ThemePreference } from '@/lib/types';

type AppState = {
  themePreference: ThemePreference;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  onboardingComplete: boolean;
  hydrated: boolean;
  /** Incremented whenever shifts change so dependent screens can refetch. */
  shiftsVersion: number;
  /** Incremented whenever bills/occurrences change so dependent screens can refetch. */
  billsVersion: number;
  /** Incremented whenever settings change. */
  settingsVersion: number;
  setThemePreference: (theme: ThemePreference) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  bumpShifts: () => void;
  bumpBills: () => void;
  bumpSettings: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  themePreference: 'system',
  hapticsEnabled: true,
  notificationsEnabled: false,
  onboardingComplete: false,
  hydrated: false,
  shiftsVersion: 0,
  billsVersion: 0,
  settingsVersion: 0,
  setThemePreference: (themePreference) => set({ themePreference }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  setHydrated: (hydrated) => set({ hydrated }),
  bumpShifts: () => set((s) => ({ shiftsVersion: s.shiftsVersion + 1 })),
  bumpBills: () => set((s) => ({ billsVersion: s.billsVersion + 1 })),
  bumpSettings: () => set((s) => ({ settingsVersion: s.settingsVersion + 1 })),
}));
