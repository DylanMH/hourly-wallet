import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius } from '@/theme/spacing';

type ProgressBarProps = {
  /** Value between 0 and 1. */
  progress: number;
  tone?: 'primary' | 'positive' | 'warning' | 'danger';
  height?: number;
};

export function ProgressBar({ progress, tone = 'primary', height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const fill = {
    primary: colors.primary,
    positive: colors.positive,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt, height }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: fill, width: `${clamped * 100}%`, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.full,
  },
});
