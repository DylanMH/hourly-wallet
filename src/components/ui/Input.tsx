import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type InputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  multiline?: boolean;
  prefix?: string;
  style?: ViewStyle;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  multiline = false,
  prefix,
  style,
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : colors.border,
          },
          multiline && styles.multilineWrap,
        ]}>
        {prefix ? (
          <Text style={[typography.body, { color: colors.textMuted }]}>{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            typography.body,
            styles.input,
            { color: colors.text },
            multiline && styles.multilineInput,
          ]}
        />
      </View>
      {error ? (
        <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  multilineWrap: {
    alignItems: 'flex-start',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
