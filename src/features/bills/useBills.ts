import { useEffect, useState } from 'react';

import { getBills } from '@/db/queries/billQueries';
import type { Bill } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function useBills(): { bills: Bill[]; loading: boolean } {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const billsVersion = useAppStore((s) => s.billsVersion);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getBills().then((result) => {
      if (!cancelled) {
        setBills(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [billsVersion, hydrated]);

  return { bills, loading };
}
