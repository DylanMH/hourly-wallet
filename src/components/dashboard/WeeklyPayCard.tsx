import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import type { PayBreakdown } from '@/lib/calculations/pay';
import { formatHoursMinutes } from '@/lib/money';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type WeeklyPayCardProps = {
  pay: PayBreakdown;
};

export function WeeklyPayCard({ pay }: WeeklyPayCardProps) {
  const { colors } = useTheme();

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        This week (estimated)
      </Text>
      <MoneyText amount={pay.estimatedNetPay} size="xl" tone="positive" />
      <Text style={[typography.caption, { color: colors.textMuted }]}>estimated take-home</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Hours</Text>
          <Text style={[typography.bodyMedium, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
            {formatHoursMinutes(pay.totalHours * 60)}
            {pay.overtimeHours > 0 ? ` (${pay.overtimeHours.toFixed(1)} OT)` : ''}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Gross</Text>
          <MoneyText amount={pay.grossPay} size="md" />
        </View>
        <View style={styles.item}>
          <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Taxes</Text>
          <MoneyText amount={-pay.estimatedTaxes} size="md" tone="muted" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  item: {
    flex: 1,
    gap: 2,
  },
});
