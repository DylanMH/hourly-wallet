import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
    dismissClockedInNotification,
    showClockedInNotification,
    updateClockedInNotification,
} from "@/lib/notifications";
import type { ClockStatus, Shift } from "@/lib/types";
import { useAppStore } from "@/state/appStore";

export function useClockedInNotification(
  shift: Shift | null,
  status: ClockStatus,
) {
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const notificationIdRef = useRef<string | null>(null);
  const shiftRef = useRef(shift);
  const statusRef = useRef(status);
  const active = shift != null && !shift.clockOut;
  const shiftId = shift?.id;

  useEffect(() => {
    shiftRef.current = shift;
    statusRef.current = status;
  });

  const syncRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    syncRef.current = async () => {
      const currentShift = shiftRef.current;
      const currentStatus = statusRef.current;
      if (!notificationsEnabled || !currentShift || !active) {
        await dismissClockedInNotification();
        notificationIdRef.current = null;
        return;
      }

      // Keep a single persistent notification while clocked in.
      // Notifee's foreground service keeps it alive when the app is backgrounded.
      if (!notificationIdRef.current) {
        notificationIdRef.current = await showClockedInNotification(
          currentShift,
          currentStatus,
        );
      } else {
        await updateClockedInNotification(currentShift, currentStatus);
      }
    };
  });

  useEffect(() => {
    syncRef.current();
  }, [active, shiftId, status, notificationsEnabled]);

  // Periodically refresh the notification body so worked time stays current
  // while the app is in the foreground.
  useEffect(() => {
    if (!active || !notificationsEnabled) return;
    const interval = setInterval(() => {
      syncRef.current();
    }, 60_000);
    return () => clearInterval(interval);
  }, [active, notificationsEnabled]);

  // Re-sync when the app returns to foreground — the foreground service
  // may have been killed by the OS while backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          syncRef.current();
        }
      },
    );
    return () => subscription.remove();
  }, []);
}
