import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BadgeTone = 'default' | 'primary' | 'positive' | 'warning' | 'danger';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const { colors } = useTheme();

  const palette: Record<BadgeTone, { bg: string; fg: string }> = {
    default: { bg: colors.surfaceAlt, fg: colors.textSecondary },
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    positive: { bg: colors.positiveMuted, fg: colors.positive },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
  };

  const { bg, fg } = palette[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[typography.caption, { color: fg, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
});
