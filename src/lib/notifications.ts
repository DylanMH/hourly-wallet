import { parseISO, setHours, setMinutes, subDays } from "date-fns";
import * as Notifications from "expo-notifications";

import { calculateWorkedMinutes } from "@/lib/calculations/shifts";
import { formatTime } from "@/lib/dates";
import { formatCurrency, formatHoursMinutes } from "@/lib/money";
import type { Bill, BillOccurrence, Shift } from "@/lib/types";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isClockedIn =
      notification.request.content.data?.type === "clocked-in";
    return {
      shouldShowBanner: !isClockedIn,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
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
  occurrence: BillOccurrence,
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
        title: `${bill.name} due ${daysBefore === 0 ? "today" : `in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`}`,
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

export async function cancelBillReminder(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may already be delivered or cancelled; ignore.
  }
}

export async function showClockedInNotification(
  shift: Shift,
  jobName?: string,
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const minutes = calculateWorkedMinutes(shift);
    const gross = (minutes / 60) * shift.hourlyRateSnapshot;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: jobName ? `Clocked in · ${jobName}` : "Clocked in",
        body: `Since ${formatTime(shift.clockIn)} · ${formatHoursMinutes(minutes)} · ~${formatCurrency(gross)}`,
        data: { type: "clocked-in" },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
    });
  } catch {
    return null;
  }
}

export async function updateClockedInNotification(
  notificationId: string,
  shift: Shift,
  jobName?: string,
): Promise<void> {
  try {
    const minutes = calculateWorkedMinutes(shift);
    const gross = (minutes / 60) * shift.hourlyRateSnapshot;
    await Notifications.dismissNotificationAsync(notificationId);
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: jobName ? `Clocked in · ${jobName}` : "Clocked in",
        body: `Since ${formatTime(shift.clockIn)} · ${formatHoursMinutes(minutes)} · ~${formatCurrency(gross)}`,
        data: { type: "clocked-in" },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
    });
  } catch {
    // Ignore update failures.
  }
}

export async function dismissClockedInNotification(
  notificationId?: string,
): Promise<void> {
  try {
    if (notificationId) {
      await Notifications.dismissNotificationAsync(notificationId);
    }
    const delivered = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      delivered
        .filter((n) => n.request.content.data?.type === "clocked-in")
        .map((n) =>
          Notifications.dismissNotificationAsync(n.request.identifier),
        ),
    );
  } catch {
    // Ignore dismiss failures.
  }
}
