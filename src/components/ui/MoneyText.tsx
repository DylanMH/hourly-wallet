import React from 'react';
import { Text, TextStyle } from 'react-native';

import { formatCurrency } from '@/lib/money';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

type MoneyTextProps = {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'positive' | 'warning' | 'danger' | 'muted';
  style?: TextStyle;
  numberOfLines?: number;
};

export function MoneyText({
  amount,
  size = 'md',
  tone = 'default',
  style,
  numberOfLines,
}: MoneyTextProps) {
  const { colors } = useTheme();

  const toneColor = {
    default: colors.text,
    positive: colors.positive,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.textSecondary,
  }[tone];

  const sizeStyle = {
    sm: typography.caption,
    md: typography.bodyMedium,
    lg: typography.title,
    xl: typography.display,
  }[size];

  return (
    <Text
      style={[sizeStyle, { color: toneColor, fontVariant: ['tabular-nums'] }, style]}
      numberOfLines={numberOfLines}>
      {formatCurrency(amount)}
    </Text>
  );
}
