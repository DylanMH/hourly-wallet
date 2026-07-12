import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
  type NotificationSettings,
} from "@notifee/react-native";
import { parseISO, setHours, setMinutes, subDays } from "date-fns";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { formatTime } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import type { Bill, BillOccurrence, ClockStatus, Shift } from "@/lib/types";

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

const CLOCK_CHANNEL_ID = "clock-status";
const CLOCK_NOTIFICATION_ID = "clock-status";

function titleForStatus(status: ClockStatus): string {
  switch (status) {
    case "on-lunch":
      return "On lunch";
    case "on-break":
      return "On break";
    case "clocked-in":
    default:
      return "Clocked in";
  }
}

function timestampForStatus(status: ClockStatus, shift: Shift): number {
  if (status === "on-lunch" && shift.lunchStart) {
    return new Date(shift.lunchStart).getTime();
  }
  if (status === "on-break") {
    const activeBreak = shift.breaks.find((b) => !b.end);
    if (activeBreak) {
      return new Date(activeBreak.start).getTime();
    }
  }
  return new Date(shift.clockIn).getTime();
}

function bodyForStatus(status: ClockStatus, shift: Shift): string {
  if (status === "on-lunch" && shift.lunchStart) {
    return `Lunch started at ${formatTime(shift.lunchStart)}`;
  }
  if (status === "on-break") {
    const activeBreak = shift.breaks.find((b) => !b.end);
    if (activeBreak) {
      return `Break started at ${formatTime(activeBreak.start)}`;
    }
  }
  return `Started at ${formatTime(shift.clockIn)}`;
}

async function ensureClockChannel(): Promise<void> {
  await notifee.createChannel({
    id: CLOCK_CHANNEL_ID,
    name: "Clock status",
    lights: false,
    vibration: false,
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
  });
}

function isAuthorized(settings: NotificationSettings): boolean {
  return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
}

let stopForegroundServiceResolver: (() => void) | null = null;

let activeShift: Shift | null = null;
let activeStatus: ClockStatus = "clocked-in";

async function displayClockNotification(): Promise<void> {
  if (!activeShift) return;
  await notifee.displayNotification({
    id: CLOCK_NOTIFICATION_ID,
    title: titleForStatus(activeStatus),
    body: bodyForStatus(activeStatus, activeShift),
    android: {
      channelId: CLOCK_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      pressAction: { id: "default" },
      showChronometer: true,
      chronometerDirection: "up",
      showTimestamp: false,
      timestamp: timestampForStatus(activeStatus, activeShift),
    },
  });
}

export async function dismissClockedInNotification(
  _notificationId?: string,
): Promise<void> {
  try {
    activeShift = null;
    if (Platform.OS === "android" && stopForegroundServiceResolver) {
      stopForegroundServiceResolver();
      stopForegroundServiceResolver = null;
    }
    await notifee.stopForegroundService();
    await notifee.cancelNotification(CLOCK_NOTIFICATION_ID);
  } catch {
    // Ignore dismiss failures.
  }
}

export async function showClockedInNotification(
  shift: Shift,
  status: ClockStatus,
): Promise<string | null> {
  try {
    const settings = await notifee.requestPermission();
    if (!isAuthorized(settings)) return null;

    activeShift = shift;
    activeStatus = status;

    await ensureClockChannel();
    await displayClockNotification();
    return CLOCK_NOTIFICATION_ID;
  } catch {
    return null;
  }
}

export async function updateClockedInNotification(
  _notificationId: string,
  shift: Shift,
  status: ClockStatus,
): Promise<void> {
  try {
    activeShift = shift;
    activeStatus = status;
    await displayClockNotification();
  } catch {
    // Ignore update failures.
  }
}

if (Platform.OS === "android") {
  notifee.registerForegroundService(() => {
    // Keep the service alive until the user clocks out. The notification
    // uses Android's native chronometer to count elapsed time, so it keeps
    // updating even when the app's JS runtime is not running.
    return new Promise((resolve) => {
      stopForegroundServiceResolver = resolve;
    });
  });
}
