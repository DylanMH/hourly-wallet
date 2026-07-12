import notifee, {
    AndroidImportance,
    AndroidVisibility,
    AuthorizationStatus,
    EventType,
    type NotificationSettings,
} from "@notifee/react-native";
import { parseISO, setHours, setMinutes, subDays } from "date-fns";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
    clockOut,
    endBreak,
    endLunch,
    startBreak,
    startLunch,
} from "@/features/clock/clockService";
import {
    calculateWorkedHours,
    calculateWorkedMinutes,
} from "@/lib/calculations/shifts";
import { formatCurrency, formatHoursMinutes } from "@/lib/money";
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
let currentNotificationId = "clock-status";
let notificationCounter = 0;

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

function bodyForStatus(status: ClockStatus, shift: Shift): string {
  const now = new Date();
  const workedMins = calculateWorkedMinutes(shift, now);
  const workedStr = `${formatHoursMinutes(workedMins)} worked`;
  const earned = calculateWorkedHours(shift, now) * shift.hourlyRateSnapshot;
  const earnedStr = `~${formatCurrency(earned)} earned`;

  if (status === "on-lunch") {
    const activeLunch = shift.lunches.find((l) => !l.end);
    if (activeLunch) {
      const lunchMins = Math.floor(
        (now.getTime() - new Date(activeLunch.start).getTime()) / 60000,
      );
      return `${formatHoursMinutes(lunchMins)} on lunch · ${workedStr} · ${earnedStr}`;
    }
  }
  if (status === "on-break") {
    const activeBreak = shift.breaks.find((b) => !b.end);
    if (activeBreak) {
      const breakMins = Math.floor(
        (now.getTime() - new Date(activeBreak.start).getTime()) / 60000,
      );
      const paidLabel = activeBreak.paid ? " (paid)" : " (unpaid)";
      return `${formatHoursMinutes(breakMins)} on break${paidLabel} · ${workedStr} · ${earnedStr}`;
    }
  }
  return `${workedStr} · ${earnedStr}`;
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

function actionsForStatus(status: ClockStatus) {
  switch (status) {
    case "clocked-in":
      return [
        {
          title: "Lunch",
          id: "start-lunch",
          pressAction: { id: "start-lunch" },
        },
        {
          title: "Break",
          id: "start-break",
          pressAction: { id: "start-break" },
        },
        {
          title: "Clock Out",
          id: "clock-out",
          pressAction: { id: "clock-out" },
        },
      ];
    case "on-lunch":
      return [
        {
          title: "End Lunch",
          id: "end-lunch",
          pressAction: { id: "end-lunch" },
        },
      ];
    case "on-break":
      return [
        {
          title: "End Break",
          id: "end-break",
          pressAction: { id: "end-break" },
        },
      ];
    default:
      return [];
  }
}

async function displayClockNotification(id: string): Promise<void> {
  if (!activeShift) return;
  await notifee.displayNotification({
    id,
    title: titleForStatus(activeStatus),
    body: bodyForStatus(activeStatus, activeShift),
    android: {
      channelId: CLOCK_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      pressAction: { id: "default" },
      actions: actionsForStatus(activeStatus),
    },
  });
}

export async function dismissClockedInNotification(): Promise<void> {
  try {
    activeShift = null;
    if (Platform.OS === "android" && stopForegroundServiceResolver) {
      stopForegroundServiceResolver();
      stopForegroundServiceResolver = null;
    }
    await notifee.stopForegroundService();
    await notifee.cancelNotification(currentNotificationId);
    currentNotificationId = "clock-status";
    notificationCounter = 0;
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
    await displayClockNotification(currentNotificationId);
    return currentNotificationId;
  } catch {
    return null;
  }
}

export async function updateClockedInNotification(
  shift: Shift,
  status: ClockStatus,
): Promise<void> {
  try {
    const statusChanged = activeStatus !== status;
    activeShift = shift;
    activeStatus = status;

    if (statusChanged) {
      // Use a fresh notification ID so Android creates a completely new
      // notification with a fresh chronometer, rather than trying to update
      // the base timestamp on the existing one (which Android ignores).
      const oldId = currentNotificationId;
      notificationCounter += 1;
      currentNotificationId = `clock-status-${notificationCounter}`;

      if (stopForegroundServiceResolver) {
        stopForegroundServiceResolver();
        stopForegroundServiceResolver = null;
      }
      await notifee.stopForegroundService();
      await notifee.cancelNotification(oldId);
      await displayClockNotification(currentNotificationId);
    } else {
      await displayClockNotification(currentNotificationId);
    }
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

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    // Only handle press actions, not dismissal or other events.
    if (type !== EventType.PRESS) return;

    const pressId = detail.pressAction?.id;
    try {
      switch (pressId) {
        case "start-lunch":
          await startLunch();
          break;
        case "end-lunch":
          await endLunch();
          break;
        case "start-break":
          await startBreak();
          break;
        case "end-break":
          await endBreak();
          break;
        case "clock-out":
          await clockOut({ autoCloseActive: true });
          break;
        default:
          return;
      }
    } catch {
      // Errors from invalid state transitions are expected — ignore silently.
    }
  });
}
