import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ClockActionButtons } from '@/components/clock/ClockActionButtons';
import { ClockStatusCard } from '@/components/clock/ClockStatusCard';
import { ShiftFormModal } from '@/components/clock/ShiftFormModal';
import { ShiftHistoryList } from '@/components/clock/ShiftHistoryList';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useActiveShift } from '@/features/clock/useActiveShift';
import { useRecentShifts } from '@/features/clock/useShifts';
import type { Shift } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function ClockScreen() {
  const { colors } = useTheme();
  const { shift, status, refresh } = useActiveShift();
  const { shifts } = useRecentShifts(20);
  const [formVisible, setFormVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  return (
    <Screen>
      <Text style={[typography.title, { color: colors.text }]}>Clock</Text>

      <ClockStatusCard shift={shift} status={status} />
      <ClockActionButtons status={status} onChanged={refresh} />

      <SectionHeader
        title="Shift History"
        action={
          <Pressable
            onPress={() => {
              setEditingShift(null);
              setFormVisible(true);
            }}
            style={styles.addButton}
            hitSlop={8}>
            <Plus size={18} color={colors.primary} />
            <Text style={[typography.captionMedium, { color: colors.primary }]}>Add shift</Text>
          </Pressable>
        }
      />
      <ShiftHistoryList
        shifts={shifts}
        onEdit={(s) => {
          setEditingShift(s);
          setFormVisible(true);
        }}
      />

      <ShiftFormModal
        visible={formVisible}
        shift={editingShift}
        onClose={() => {
          setFormVisible(false);
          setEditingShift(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
