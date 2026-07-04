import { useCallback, useEffect, useState } from 'react';

import { getActiveShift } from '@/db/queries/shiftQueries';
import { getClockStatus } from '@/features/clock/clockService';
import type { ClockStatus, Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function useActiveShift(): {
  shift: Shift | null;
  status: ClockStatus;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const shiftsVersion = useAppStore((s) => s.shiftsVersion);
  const hydrated = useAppStore((s) => s.hydrated);

  const refresh = useCallback(async () => {
    const active = await getActiveShift();
    setShift(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getActiveShift().then((active) => {
      if (!cancelled) {
        setShift(active);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shiftsVersion, hydrated]);

  return { shift, status: getClockStatus(shift), loading, refresh };
}
