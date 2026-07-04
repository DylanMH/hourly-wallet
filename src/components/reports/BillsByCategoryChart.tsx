import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BillsByCategoryChartProps = {
  data: { category: string; total: number }[];
};

export function BillsByCategoryChart({ data }: BillsByCategoryChartProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <Card>
      <Text style={[typography.heading, { color: colors.text }]}>Bills by category</Text>
      {data.length === 0 ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          No bills in this period.
        </Text>
      ) : (
        data.map((item) => (
          <View key={item.category} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
                {item.category}
              </Text>
              <MoneyText amount={item.total} size="sm" />
            </View>
            <ProgressBar progress={item.total / max} />
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
