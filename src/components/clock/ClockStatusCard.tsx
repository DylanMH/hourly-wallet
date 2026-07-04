import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { calculateWorkedHours, calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { formatCurrency, formatHoursMinutes } from '@/lib/money';
import type { ClockStatus, Shift } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const STATUS_META: Record<ClockStatus, { label: string; tone: 'default' | 'positive' | 'warning' }> = {
  'not-clocked-in': { label: 'Not clocked in', tone: 'default' },
  'clocked-in': { label: 'Clocked in', tone: 'positive' },
  'on-lunch': { label: 'On lunch', tone: 'warning' },
  'on-break': { label: 'On break', tone: 'warning' },
};

type ClockStatusCardProps = {
  shift: Shift | null;
  status: ClockStatus;
};

export function ClockStatusCard({ shift, status }: ClockStatusCardProps) {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  const active = shift != null && !shift.clockOut;

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(new Date()), 1000 * 10);
    return () => clearInterval(interval);
  }, [active]);

  const meta = STATUS_META[status];
  const workedMinutes = active && shift ? calculateWorkedMinutes(shift, now) : 0;
  const earned =
    active && shift ? calculateWorkedHours(shift, now) * shift.hourlyRateSnapshot : 0;

  return (
    <Card style={styles.card}>
      <Badge label={meta.label} tone={meta.tone} />
      <Text style={[typography.displayLarge, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
        {formatHoursMinutes(workedMinutes)}
      </Text>
      <View style={styles.row}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {active
            ? `~${formatCurrency(earned)} earned this shift (est. gross)`
            : 'Clock in to start tracking your shift.'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
