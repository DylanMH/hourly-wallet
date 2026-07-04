import * as Notifications from 'expo-notifications';
import { parseISO, setHours, setMinutes, subDays } from 'date-fns';

import { formatCurrency } from '@/lib/money';
import type { Bill, BillOccurrence } from '@/lib/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

/**
 * Schedules a local reminder for a bill occurrence at 9:00 AM,
 * `reminderDaysBefore` days before the due date (default: same day).
 * Returns the notification id, or null if it is in the past / not permitted.
 */
export async function scheduleBillReminder(
  bill: Bill,
  occurrence: BillOccurrence
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const daysBefore = bill.reminderDaysBefore ?? 0;
    let fireDate = subDays(parseISO(occurrence.dueDate), daysBefore);
    fireDate = setMinutes(setHours(fireDate, 9), 0);
    if (fireDate.getTime() <= Date.now()) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${bill.name} due ${daysBefore === 0 ? 'today' : `in ${daysBefore} day${daysBefore === 1 ? '' : 's'}`}`,
        body: `${formatCurrency(occurrence.amountSnapshot)} is due. Open Hourly Wallet to mark it paid.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelBillReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may already be delivered or cancelled; ignore.
  }
}
