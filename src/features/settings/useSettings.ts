import { useEffect, useState } from 'react';

import { getPaySettings } from '@/db/queries/settingsQueries';
import type { PaySettings } from '@/lib/types';
import { useAppStore } from '@/state/appStore';

export function useSettings(): { settings: PaySettings | null; loading: boolean } {
  const [settings, setSettings] = useState<PaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const settingsVersion = useAppStore((s) => s.settingsVersion);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    getPaySettings().then((result) => {
      if (!cancelled) {
        setSettings(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settingsVersion, hydrated]);

  return { settings, loading };
}
