import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type SelectOption<T extends string> = { label: string; value: T };

type SelectProps<T extends string> = {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  style?: ViewStyle;
};

export function Select<T extends string>({ label, value, options, onChange, style }: SelectProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}>
        <Text style={[typography.body, { color: colors.text }]}>
          {selected?.label ?? 'Select…'}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {label ? (
              <Text
                style={[typography.heading, styles.sheetTitle, { color: colors.text }]}>
                {label}
              </Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}>
                  <Text
                    style={[
                      typography.body,
                      { color: item.value === value ? colors.primary : colors.text },
                    ]}>
                    {item.label}
                  </Text>
                  {item.value === value ? <Check size={18} color={colors.primary} /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    maxHeight: '70%',
  },
  sheetTitle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
