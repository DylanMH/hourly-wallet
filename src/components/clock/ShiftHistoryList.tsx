import { Pencil, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { deleteShift } from '@/db/queries/shiftQueries';
import { calculateWorkedHours, calculateWorkedMinutes } from '@/lib/calculations/shifts';
import { formatFullDate, formatTime } from '@/lib/dates';
import { hapticWarning } from '@/lib/haptics';
import { formatCurrency, formatHoursMinutes } from '@/lib/money';
import type { Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ShiftHistoryListProps = {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  jobNameById?: Record<string, string>;
};

export function ShiftHistoryList({ shifts, onEdit, jobNameById }: ShiftHistoryListProps) {
  const { colors } = useTheme();
  const bumpShifts = useAppStore((s) => s.bumpShifts);
  const [deleting, setDeleting] = useState<Shift | null>(null);

  const completed = shifts.filter((s) => s.clockOut);

  if (completed.length === 0) {
    return (
      <EmptyState
        title="No shifts yet"
        message="Your completed shifts will appear here. You can also add one manually."
      />
    );
  }

  return (
    <View style={styles.list}>
      {completed.map((shift) => {
        const minutes = calculateWorkedMinutes(shift);
        const gross = calculateWorkedHours(shift) * shift.hourlyRateSnapshot;
        const jobName = jobNameById?.[shift.jobId];
        return (
          <Card key={shift.id} style={styles.item}>
            <View style={styles.itemMain}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>
                {formatFullDate(shift.clockIn)}
                {jobName ? ` · ${jobName}` : ''}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatTime(shift.clockIn)} – {shift.clockOut ? formatTime(shift.clockOut) : '…'}
                {'  ·  '}
                {formatHoursMinutes(minutes)}
                {'  ·  ~'}
                {formatCurrency(gross)} gross
              </Text>
              {shift.notes ? (
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
                  {shift.notes}
                </Text>
              ) : null}
            </View>
            <View style={styles.itemActions}>
              <Pressable onPress={() => onEdit(shift)} hitSlop={8}>
                <Pencil size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => setDeleting(shift)} hitSlop={8}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        );
      })}

      <ConfirmModal
        visible={deleting != null}
        title="Delete shift?"
        message={
          deleting
            ? `This will permanently remove the shift on ${formatFullDate(deleting.clockIn)}.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleting) {
            await deleteShift(deleting.id);
            hapticWarning();
            bumpShifts();
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemMain: {
    flex: 1,
    gap: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
});
