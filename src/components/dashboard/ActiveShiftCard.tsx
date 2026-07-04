import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { clockIn, clockOut, endBreak, endLunch } from '@/features/clock/clockService';
import { calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { hapticImpact, hapticSuccess } from '@/lib/haptics';
import { formatHoursMinutes } from '@/lib/money';
import type { ClockStatus, Shift } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ActiveShiftCardProps = {
  shift: Shift | null;
  status: ClockStatus;
  todayMinutes: number;
  jobName?: string;
  jobId?: string;
  onChanged: () => void;
};

export function ActiveShiftCard({ shift, status, todayMinutes, jobName, jobId, onChanged }: ActiveShiftCardProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const active = shift != null && !shift.clockOut;

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000 * 30);
    return () => clearInterval(interval);
  }, [active]);

  const currentMinutes = active && shift ? calculateWorkedMinutes(shift) : 0;

  async function quickAction() {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'not-clocked-in') {
        await clockIn(jobId);
        hapticSuccess();
      } else if (status === 'on-lunch') {
        await endLunch();
        hapticImpact();
      } else if (status === 'on-break') {
        await endBreak();
        hapticImpact();
      } else {
        await clockOut({ autoCloseActive: true });
        hapticSuccess();
      }
      onChanged();
    } catch {
      // Ignore quick-action failures on dashboard; Clock tab shows details.
    } finally {
      setBusy(false);
    }
  }

  const statusMeta: Record<ClockStatus, { label: string; tone: 'default' | 'positive' | 'warning'; action: string; }> = {
    'not-clocked-in': { label: 'Not clocked in', tone: 'default', action: 'Clock In' },
    'clocked-in': { label: 'Clocked in', tone: 'positive', action: 'Clock Out' },
    'on-lunch': { label: 'On lunch', tone: 'warning', action: 'End Lunch' },
    'on-break': { label: 'On break', tone: 'warning', action: 'End Break' },
  };
  const meta = statusMeta[status];

  return (
    <Card>
      <View style={styles.header}>
        <Badge label={meta.label} tone={meta.tone} />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {jobName ? `${jobName} • Today` : 'Today'}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[typography.title, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
            {formatHoursMinutes(active ? currentMinutes : 0)}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>current shift</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[typography.title, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
            {formatHoursMinutes(todayMinutes)}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>worked today</Text>
        </View>
      </View>
      <Button
        label={meta.action}
        size="lg"
        variant={status === 'not-clocked-in' ? 'positive' : status === 'clocked-in' ? 'danger' : 'primary'}
        loading={busy}
        onPress={quickAction}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginVertical: spacing.sm,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
});
