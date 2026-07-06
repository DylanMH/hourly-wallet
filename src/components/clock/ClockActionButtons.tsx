import DatePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
    clockIn,
    clockInAt,
    clockOut,
    endBreak,
    endLunch,
    startBreak,
    startLunch,
} from "@/features/clock/clockService";
import { hapticImpact, hapticSuccess, hapticWarning } from "@/lib/haptics";
import type { ClockStatus } from "@/lib/types";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/useTheme";

type ClockActionButtonsProps = {
  status: ClockStatus;
  jobId?: string;
  onChanged: () => void;
};

export function ClockActionButtons({
  status,
  jobId,
  onChanged,
}: ClockActionButtonsProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [confirmAutoClose, setConfirmAutoClose] = useState(false);
  const [customTimePickerOpen, setCustomTimePickerOpen] = useState(false);
  const [customTimeError, setCustomTimeError] = useState("");

  async function run(action: () => Promise<unknown>, haptic: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      haptic();
      onChanged();
    } catch (error) {
      if (error instanceof Error && error.message === "END_ACTIVE_FIRST") {
        setConfirmAutoClose(true);
      } else {
        hapticWarning();
      }
    } finally {
      setBusy(false);
    }
  }

  const primary = (() => {
    switch (status) {
      case "not-clocked-in":
        return (
          <View style={styles.column}>
            <Button
              label="Clock In"
              size="lg"
              variant="positive"
              loading={busy}
              onPress={() => run(() => clockIn(jobId), hapticSuccess)}
            />
            <Button
              label="Clock In at Custom Time"
              variant="secondary"
              loading={busy}
              onPress={() => {
                setCustomTimeError("");
                setCustomTimePickerOpen(true);
              }}
            />
            {customTimeError ? (
              <Text style={[typography.caption, { color: colors.danger }]}>
                {customTimeError}
              </Text>
            ) : null}
          </View>
        );
      case "on-lunch":
        return (
          <Button
            label="End Lunch"
            size="lg"
            loading={busy}
            onPress={() => run(endLunch, hapticImpact)}
          />
        );
      case "on-break":
        return (
          <Button
            label="End Break"
            size="lg"
            loading={busy}
            onPress={() => run(endBreak, hapticImpact)}
          />
        );
      default:
        return (
          <Button
            label="Clock Out"
            size="lg"
            variant="danger"
            loading={busy}
            onPress={() => run(() => clockOut(), hapticSuccess)}
          />
        );
    }
  })();

  return (
    <View style={styles.container}>
      {primary}
      {status === "clocked-in" ? (
        <View style={styles.secondaryRow}>
          <Button
            label="Start Lunch"
            variant="secondary"
            style={styles.secondary}
            onPress={() => run(startLunch, hapticImpact)}
          />
          <Button
            label="Start Break"
            variant="secondary"
            style={styles.secondary}
            onPress={() => run(startBreak, hapticImpact)}
          />
        </View>
      ) : null}
      {status === "on-lunch" || status === "on-break" ? (
        <Button
          label="Clock Out"
          variant="secondary"
          onPress={() => run(() => clockOut(), hapticSuccess)}
        />
      ) : null}

      <ConfirmModal
        visible={confirmAutoClose}
        title="End active lunch/break?"
        message="You still have an active lunch or break. Clocking out will end it now."
        confirmLabel="End and Clock Out"
        onConfirm={() => {
          setConfirmAutoClose(false);
          run(() => clockOut({ autoCloseActive: true }), hapticSuccess);
        }}
        onCancel={() => setConfirmAutoClose(false)}
      />

      {customTimePickerOpen ? (
        <DatePicker
          value={new Date()}
          mode="time"
          presentation="dialog"
          onValueChange={(_event: unknown, selected?: Date) => {
            setCustomTimePickerOpen(false);
            if (!selected) return;
            if (selected > new Date()) {
              setCustomTimeError("Custom time cannot be in the future.");
              return;
            }
            setCustomTimeError("");
            run(() => clockInAt(selected, jobId), hapticSuccess);
          }}
          onDismiss={() => setCustomTimePickerOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  column: {
    gap: spacing.md,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  secondary: {
    flex: 1,
  },
});
