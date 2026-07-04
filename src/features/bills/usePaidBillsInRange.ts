import { useEffect, useState } from 'react';

import { getPaidOccurrencesInRange } from '@/db/queries/billQueries';
import type { DateRange } from '@/lib/dates';
import { toDateKey } from '@/lib/dates';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function usePaidBillsInRange(range: DateRange): {
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
    getPaidOccurrencesInRange(
      range.start.toISOString(),
      range.end.toISOString(),
      toDateKey(range.start),
      toDateKey(range.end)
    ).then((result) => {
      if (!cancelled) {
        setOccurrences(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [billsVersion, hydrated, range.start, range.end]);

  return { occurrences, loading };
}
