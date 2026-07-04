import { useCallback, useEffect, useState } from 'react';

import { getRecentShifts, getShiftsBetween } from '@/db/queries/shiftQueries';
import type { DateRange } from '@/lib/dates';
import type { Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function useRecentShifts(limit = 20): { shifts: Shift[]; loading: boolean } {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const shiftsVersion = useAppStore((s) => s.shiftsVersion);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getRecentShifts(limit).then((result) => {
      if (!cancelled) {
        setShifts(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [limit, shiftsVersion, hydrated]);

  return { shifts, loading };
}

export function useShiftsInRange(range: DateRange): {
  shifts: Shift[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const shiftsVersion = useAppStore((s) => s.shiftsVersion);
  const hydrated = useAppStore((s) => s.hydrated);
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  const refresh = useCallback(async () => {
    const result = await getShiftsBetween(
      new Date(startMs).toISOString(),
      new Date(endMs).toISOString()
    );
    setShifts(result);
    setLoading(false);
  }, [startMs, endMs]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getShiftsBetween(new Date(startMs).toISOString(), new Date(endMs).toISOString()).then(
      (result) => {
        if (!cancelled) {
          setShifts(result);
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [startMs, endMs, shiftsVersion, hydrated]);

  return { shifts, loading, refresh };
}
