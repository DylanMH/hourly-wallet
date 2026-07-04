import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { DailyHours } from '@/features/reports/reportService';
import { formatHoursMinutes } from '@/lib/money';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type WeeklyHoursChartProps = {
  data: DailyHours[];
  title?: string;
};

export function WeeklyHoursChart({ data, title = 'Hours worked' }: WeeklyHoursChartProps) {
  const { colors } = useTheme();
  const max = Math.max(60, ...data.map((d) => d.minutes));
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <Card>
      <View style={styles.header}>
        <Text style={[typography.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>
          {formatHoursMinutes(total)}
        </Text>
      </View>
      <View style={styles.chart}>
        {data.map((day, index) => (
          <View key={`${day.label}-${index}`} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: day.minutes > 0 ? colors.primary : colors.surfaceAlt,
                    height: `${Math.max(4, (day.minutes / max) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>
              {day.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120,
    marginTop: spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: radius.sm,
  },
});
