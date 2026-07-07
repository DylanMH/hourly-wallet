import { useEffect, useRef } from "react";

import {
    dismissClockedInNotification,
    showClockedInNotification,
    updateClockedInNotification,
} from "@/lib/notifications";
import type { Shift } from "@/lib/types";

const UPDATE_INTERVAL_MS = 60000;

export function useClockedInNotification(
  shift: Shift | null,
  jobName?: string,
) {
  const notificationIdRef = useRef<string | null>(null);
  const active = shift != null && !shift.clockOut;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    async function sync() {
      if (!shift || !active) {
        await dismissClockedInNotification(
          notificationIdRef.current ?? undefined,
        );
        notificationIdRef.current = null;
        return;
      }

      if (!notificationIdRef.current) {
        notificationIdRef.current = await showClockedInNotification(
          shift,
          jobName,
        );
      } else {
        await updateClockedInNotification(
          notificationIdRef.current,
          shift,
          jobName,
        );
      }
    }

    sync();
    if (active) {
      interval = setInterval(sync, UPDATE_INTERVAL_MS);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [shift, active, jobName]);
}
