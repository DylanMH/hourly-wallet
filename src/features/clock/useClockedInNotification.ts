import { useEffect, useRef } from "react";

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
  _jobName?: string,
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
        await dismissClockedInNotification(
          notificationIdRef.current ?? undefined,
        );
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
        await updateClockedInNotification(
          notificationIdRef.current,
          currentShift,
          currentStatus,
        );
      }
    };
  });

  useEffect(() => {
    syncRef.current();
  }, [active, shiftId, status, notificationsEnabled]);
}
