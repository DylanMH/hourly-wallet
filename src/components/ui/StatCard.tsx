import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

type StatCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'danger';
  style?: ViewStyle;
};

export function StatCard({ label, value, sublabel, icon, tone = 'default', style }: StatCardProps) {
  const { colors } = useTheme();
  const valueColor = {
    default: colors.text,
    positive: colors.positive,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <Card style={StyleSheet.flatten([styles.card, style])}>
      <View style={styles.header}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        {icon}
      </View>
      <Text style={[typography.title, { color: valueColor, fontVariant: ['tabular-nums'] }]}>
        {value}
      </Text>
      {sublabel ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{sublabel}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
