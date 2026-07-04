import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useEffect, useState } from 'react';

import { getOccurrencesBetween } from '@/db/queries/billQueries';
import { toDateKey } from '@/lib/dates';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

/**
 * Loads bill occurrences from a few months back through the generation
 * horizon so overdue, current, and upcoming bills are all available.
 */
export function useBillOccurrences(monthsBack = 3): {
  occurrences: BillOccurrenceWithBill[];
  loading: boolean;
} {
  const [occurrences, setOccurrences] = useState<BillOccurrenceWithBill[]>([]);
  const [loading, setLoading] = useState(true);
  const billsVersion = useAppStore((s) => s.billsVersion);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const now = new Date();
    const start = toDateKey(startOfMonth(subMonths(now, monthsBack)));
    const end = toDateKey(endOfMonth(addMonths(now, 2)));
    getOccurrencesBetween(start, end).then((result) => {
      if (!cancelled) {
        setOccurrences(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [billsVersion, hydrated, monthsBack]);

  return { occurrences, loading };
}
