import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  getBillsDueThisMonth,
  getPaidBillsThisMonth,
  sumOccurrences,
} from '@/lib/calculations/bills';
import type { BillOccurrenceWithBill } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillsSummaryCardProps = {
  occurrences: BillOccurrenceWithBill[];
};

export function BillsSummaryCard({ occurrences }: BillsSummaryCardProps) {
  const { colors } = useTheme();

  const dueThisMonth = getBillsDueThisMonth(occurrences);
  const monthTotal = sumOccurrences(dueThisMonth);
  const paidTotal = sumOccurrences(getPaidBillsThisMonth(occurrences));
  const subsTotal = sumOccurrences(
    dueThisMonth.filter((o) => o.bill.category === 'Subscription')
  );
  const progress = monthTotal > 0 ? paidTotal / monthTotal : 0;

  return (
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Bills due this month
      </Text>
      <MoneyText amount={monthTotal} size="lg" />
      <ProgressBar progress={progress} tone="positive" />
      <View style={styles.row}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Paid {paidTotal > 0 ? '' : ''}
        </Text>
        <MoneyText amount={paidTotal} size="sm" tone="positive" />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>· Remaining</Text>
        <MoneyText amount={Math.max(0, monthTotal - paidTotal)} size="sm" tone="warning" />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>· Subscriptions</Text>
        <MoneyText amount={subsTotal} size="sm" tone="muted" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
