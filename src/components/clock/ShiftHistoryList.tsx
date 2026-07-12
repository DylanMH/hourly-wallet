import { differenceInMinutes, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteShift } from "@/db/queries/shiftQueries";
import {
    calculateLunchMinutes,
    calculateWorkedHours,
    calculateWorkedMinutes,
} from "@/lib/calculations/shifts";
import { formatFullDate, formatTime } from "@/lib/dates";
import { hapticWarning } from "@/lib/haptics";
import { formatCurrency, formatHoursMinutes } from "@/lib/money";
import type { Shift } from "@/lib/types";
import { useAppStore } from "@/state/appStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type ShiftHistoryListProps = {
  shifts: Shift[];
  onEdit: (shift: Shift) => void;
  jobNameById?: Record<string, string>;
  now?: Date;
};

export function ShiftHistoryList({
  shifts,
  onEdit,
  jobNameById,
  now,
}: ShiftHistoryListProps) {
  const { colors } = useTheme();
  const bumpShifts = useAppStore((s) => s.bumpShifts);
  const [deleting, setDeleting] = useState<Shift | null>(null);

  const sorted = useMemo(
    () =>
      [...shifts].sort(
        (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
      ),
    [shifts],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No shifts yet"
        message="Your completed and active shifts will appear here. You can also add one manually."
      />
    );
  }

  return (
    <View style={styles.list}>
      {sorted.map((shift) => {
        const minutes = calculateWorkedMinutes(shift, now);
        const gross =
          calculateWorkedHours(shift, now) * shift.hourlyRateSnapshot;
        const jobName = jobNameById?.[shift.jobId];
        const lunchMinutes = calculateLunchMinutes(shift, now);
        return (
          <Card key={shift.id} style={styles.item}>
            <View style={styles.itemMain}>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>
                {formatFullDate(shift.clockIn)}
                {jobName ? ` · ${jobName}` : ""}
                {!shift.clockOut ? " · In progress" : ""}
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary }]}
              >
                {formatTime(shift.clockIn)} –{" "}
                {shift.clockOut ? formatTime(shift.clockOut) : "…"}
                {"  ·  "}
                {formatHoursMinutes(minutes)}
                {"  ·  ~"}
                {formatCurrency(gross)} gross
              </Text>
              {shift.lunchStart ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Lunch: {formatTime(shift.lunchStart)} –{" "}
                  {shift.lunchEnd ? formatTime(shift.lunchEnd) : "in progress"}{" "}
                  · {formatHoursMinutes(lunchMinutes)}
                </Text>
              ) : null}
              {shift.breaks.map((b, i) => {
                const breakMinutes = b.end
                  ? Math.max(
                      0,
                      differenceInMinutes(parseISO(b.end), parseISO(b.start)),
                    )
                  : now
                    ? Math.max(0, differenceInMinutes(now, parseISO(b.start)))
                    : 0;
                return (
                  <Text
                    key={b.id}
                    style={[typography.caption, { color: colors.textMuted }]}
                  >
                    Break {i + 1}: {formatTime(b.start)} –{" "}
                    {b.end ? formatTime(b.end) : "in progress"} ·{" "}
                    {formatHoursMinutes(breakMinutes)} ·{" "}
                    {b.paid ? "paid" : "unpaid"}
                  </Text>
                );
              })}
              {shift.notes ? (
                <Text
                  style={[typography.caption, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {shift.notes}
                </Text>
              ) : null}
            </View>
            <View style={styles.itemActions}>
              <Pressable
                onPress={() => onEdit(shift)}
                hitSlop={8}
                accessibilityLabel={`Edit shift on ${formatFullDate(shift.clockIn)}`}
                accessibilityRole="button"
              >
                <Pencil size={18} color={colors.textSecondary} />
              </Pressable>
              {shift.clockOut ? (
                <Pressable
                  onPress={() => setDeleting(shift)}
                  hitSlop={8}
                  accessibilityLabel={`Delete shift on ${formatFullDate(shift.clockIn)}`}
                  accessibilityRole="button"
                >
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              ) : null}
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
            : ""
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  itemMain: {
    flex: 1,
    gap: 2,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
  },
});
