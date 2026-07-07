import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import {
    dismissClockedInNotification,
    showClockedInNotification,
    updateClockedInNotification,
} from "@/lib/notifications";
import type { ClockStatus, Shift } from "@/lib/types";

export function useClockedInNotification(
  shift: Shift | null,
  status: ClockStatus,
  jobName?: string,
) {
  const notificationIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const shiftRef = useRef(shift);
  const jobNameRef = useRef(jobName);
  const active = shift != null && !shift.clockOut;
  const shiftId = shift?.id;

  useEffect(() => {
    shiftRef.current = shift;
    jobNameRef.current = jobName;
  });

  useEffect(() => {
    async function sync() {
      const currentShift = shiftRef.current;
      const currentJobName = jobNameRef.current;
      if (!currentShift || !active) {
        await dismissClockedInNotification(
          notificationIdRef.current ?? undefined,
        );
        notificationIdRef.current = null;
        return;
      }

      // Don't show notifications while the app is open
      if (appStateRef.current === "active") {
        await dismissClockedInNotification(
          notificationIdRef.current ?? undefined,
        );
        notificationIdRef.current = null;
        return;
      }

      // Show or update a single persistent notification when in the background
      if (!notificationIdRef.current) {
        notificationIdRef.current = await showClockedInNotification(
          currentShift,
          currentJobName,
        );
      } else {
        await updateClockedInNotification(
          notificationIdRef.current,
          currentShift,
          currentJobName,
        );
      }
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appStateRef.current = nextAppState;
      sync();
    });

    sync();

    return () => {
      subscription.remove();
    };
  }, [active, shiftId, status]);
}
