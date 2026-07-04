import * as Haptics from 'expo-haptics';

import { useAppStore } from '@/state/appStore';

function enabled(): boolean {
  return useAppStore.getState().hapticsEnabled;
}

export function hapticSuccess(): void {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning(): void {
  if (!enabled()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function hapticImpact(): void {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticSelection(): void {
  if (!enabled()) return;
  Haptics.selectionAsync().catch(() => {});
}
