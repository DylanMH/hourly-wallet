import { initDatabase } from '@/db/database';
import { getAppPref, getPaySettings, setAppPref, updatePaySettings } from '@/db/queries/settingsQueries';
import { generateAllOccurrences, processAutopayBills } from '@/features/bills/billService';
import type { PaySettings, ThemePreference } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

const PREF_KEYS = {
  onboardingComplete: 'onboarding_complete',
  theme: 'theme_preference',
  haptics: 'haptics_enabled',
  notifications: 'notifications_enabled',
} as const;

/**
 * Initializes the database, seeds settings, hydrates app preferences into the
 * store, generates bill occurrences, and processes autopay. Called on launch.
 */
export async function bootstrapApp(): Promise<void> {
  await initDatabase();
  await getPaySettings(); // seeds defaults if missing

  const store = useAppStore.getState();
  const [onboarding, theme, haptics, notifications] = await Promise.all([
    getAppPref(PREF_KEYS.onboardingComplete),
    getAppPref(PREF_KEYS.theme),
    getAppPref(PREF_KEYS.haptics),
    getAppPref(PREF_KEYS.notifications),
  ]);

  store.setOnboardingComplete(onboarding === 'true');
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    store.setThemePreference(theme);
  }
  store.setHapticsEnabled(haptics !== 'false');
  store.setNotificationsEnabled(notifications === 'true');

  await generateAllOccurrences();
  await processAutopayBills();

  store.setHydrated(true);
}

export async function savePaySettings(
  updates: Partial<Omit<PaySettings, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PaySettings> {
  const updated = await updatePaySettings(updates);
  useAppStore.getState().bumpSettings();
  return updated;
}

export async function markOnboardingComplete(): Promise<void> {
  await setAppPref(PREF_KEYS.onboardingComplete, 'true');
  useAppStore.getState().setOnboardingComplete(true);
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  await setAppPref(PREF_KEYS.theme, theme);
  useAppStore.getState().setThemePreference(theme);
}

export async function saveHapticsEnabled(enabled: boolean): Promise<void> {
  await setAppPref(PREF_KEYS.haptics, String(enabled));
  useAppStore.getState().setHapticsEnabled(enabled);
}

export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  await setAppPref(PREF_KEYS.notifications, String(enabled));
  useAppStore.getState().setNotificationsEnabled(enabled);
}
