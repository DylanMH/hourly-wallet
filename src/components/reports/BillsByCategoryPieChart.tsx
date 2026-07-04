import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { G, Path, Svg } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const PIE_COLORS = [
  '#1D6FEB',
  '#0D9488',
  '#15803D',
  '#B45309',
  '#B91C1C',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#65A30D',
  '#D97706',
  '#9333EA',
  '#2563EB',
];

export type PieSlice = {
  category: string;
  total: number;
  color: string;
  startAngle: number;
  endAngle: number;
};

export type BillsByCategoryPieChartProps = {
  data: { category: string; total: number }[];
  onSelect: (category: string) => void;
};

export function BillsByCategoryPieChart({ data, onSelect }: BillsByCategoryPieChartProps) {
  const { colors } = useTheme();
  const total = useMemo(() => data.reduce((sum, d) => sum + d.total, 0), [data]);
  const radius = 50;
  const cx = 50;
  const cy = 50;

  const slices = useMemo(() => {
    return data.reduce<PieSlice[]>((acc, item, index) => {
      const startAngle = acc.length === 0 ? -Math.PI / 2 : acc[acc.length - 1].endAngle;
      const sliceAngle = total === 0 ? 0 : (item.total / total) * Math.PI * 2;
      return [
        ...acc,
        {
          category: item.category,
          total: item.total,
          color: PIE_COLORS[index % PIE_COLORS.length],
          startAngle,
          endAngle: startAngle + sliceAngle,
        },
      ];
    }, []);
  }, [data, total]);

  function describeSlice(startAngle: number, endAngle: number): string {
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  if (data.length === 0) {
    return (
      <Card>
        <Text style={[typography.heading, { color: colors.text }]}>Bills paid by category</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>No bills paid this year.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={[typography.heading, { color: colors.text }]}>Bills paid by category</Text>
      <View style={styles.chartRow}>
        <Svg width={140} height={140} viewBox="0 0 100 100">
          <G>
            {slices.map((slice) => (
              <Path
                key={slice.category}
                d={describeSlice(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                onPress={() => onSelect(slice.category)}
              />
            ))}
          </G>
        </Svg>
        <View style={styles.legend}>
          {slices.map((slice) => {
            const percentage = total === 0 ? 0 : Math.round((slice.total / total) * 100);
            return (
              <Pressable
                key={slice.category}
                style={styles.legendItem}
                onPress={() => onSelect(slice.category)}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <View style={styles.legendText}>
                  <Text style={[typography.captionMedium, { color: colors.text }]} numberOfLines={1}>
                    {slice.category}
                  </Text>
                  <View style={styles.legendAmountRow}>
                    <MoneyText amount={slice.total} size="sm" numberOfLines={1} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{percentage}%</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legend: {
    flex: 1,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  legendText: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  legendAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
