import DatePicker from '@expo/ui/community/datetime-picker';
import { addHours, addMinutes, format, isValid, parse } from 'date-fns';
import { Calendar, TreePine, Umbrella } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getPaySettings } from '@/db/queries/settingsQueries';
import { insertShift, updateShift } from '@/db/queries/shiftQueries';
import { hapticSuccess } from '@/lib/haptics';
import type { Shift } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ShiftFormModalProps = {
  visible: boolean;
  shift: Shift | null;
  onClose: () => void;
};

const TIME_FORMAT = 'h:mm a';

type TimeFieldKey = 'clockIn' | 'clockOut' | 'lunchStart' | 'lunchEnd';

function toTimeString(iso?: string): string {
  return iso ? format(new Date(iso), TIME_FORMAT) : '';
}

function parseTimeString(dateStr: string, timeStr: string): Date | null {
  if (!timeStr.trim()) return null;
  const parsed = parse(`${dateStr} ${timeStr}`, `yyyy-MM-dd ${TIME_FORMAT}`, new Date());
  return isValid(parsed) ? parsed : null;
}

function parseDateKey(dateStr: string): Date | null {
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

function toDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ShiftFormModal({ visible, shift, onClose }: ShiftFormModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? <ShiftForm key={shift?.id ?? 'new'} shift={shift} onClose={onClose} /> : null}
    </Modal>
  );
}

function ShiftForm({ shift, onClose }: { shift: Shift | null; onClose: () => void }) {
  const { colors } = useTheme();
  const bumpShifts = useAppStore((s) => s.bumpShifts);

  const [date, setDate] = useState(shift?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [clockIn, setClockIn] = useState(shift ? toTimeString(shift.clockIn) : '');
  const [clockOut, setClockOut] = useState(toTimeString(shift?.clockOut));
  const [lunchStart, setLunchStart] = useState(toTimeString(shift?.lunchStart));
  const [lunchEnd, setLunchEnd] = useState(toTimeString(shift?.lunchEnd));
  const [isHolidayPay, setIsHolidayPay] = useState(shift?.isHolidayPay ?? false);
  const [isPTO, setIsPTO] = useState(shift?.isPTO ?? false);
  const [ptoHours, setPtoHours] = useState(() => {
    if (!shift?.isPTO || !shift.clockOut) return '8';
    const start = parseTimeString(shift.date, toTimeString(shift.clockIn));
    const end = parseTimeString(shift.date, toTimeString(shift.clockOut));
    if (!start || !end) return '8';
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    return String(Math.floor(mins / 60));
  });
  const [ptoMinutes, setPtoMinutes] = useState(() => {
    if (!shift?.isPTO || !shift.clockOut) return '0';
    const start = parseTimeString(shift.date, toTimeString(shift.clockIn));
    const end = parseTimeString(shift.date, toTimeString(shift.clockOut));
    if (!start || !end) return '0';
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    return String(mins % 60);
  });
  const [notes, setNotes] = useState(shift?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [picker, setPicker] = useState<
    | null
    | { mode: 'date'; value: Date }
    | { mode: 'time'; value: Date; field: TimeFieldKey }
  >(null);

  const dateDisplay = parseDateKey(date)
    ? format(parseDateKey(date) as Date, 'EEEE, MMM d, yyyy')
    : 'Pick a date';

  function setTimeField(field: TimeFieldKey, value: Date) {
    const text = format(value, TIME_FORMAT);
    if (field === 'clockIn') setClockIn(text);
    if (field === 'clockOut') setClockOut(text);
    if (field === 'lunchStart') setLunchStart(text);
    if (field === 'lunchEnd') setLunchEnd(text);
  }

  function openTimePicker(field: TimeFieldKey, timeStr: string) {
    const base = parseDateKey(date) ?? new Date();
    const parsed = parseTimeString(date, timeStr);
    setPicker({ mode: 'time', value: parsed ?? base, field });
  }

  function applyHolidayPay() {
    setIsHolidayPay(true);
    setIsPTO(false);
    setClockIn('9:00 AM');
    setClockOut('5:00 PM');
    setLunchStart('');
    setLunchEnd('');
  }

  function applyPTO() {
    setIsPTO(true);
    setIsHolidayPay(false);
    setLunchStart('');
    setLunchEnd('');
    syncPTOTimes(ptoHours, ptoMinutes);
  }

  function syncPTOTimes(hoursText: string, minutesText: string) {
    const hours = parseInt(hoursText, 10) || 0;
    const minutes = parseInt(minutesText, 10) || 0;
    const base = parseDateKey(date) ?? new Date();
    const start = parseTimeString(date, '9:00 AM') ?? base;
    const end = addMinutes(addHours(start, hours), minutes);
    setClockIn(format(start, TIME_FORMAT));
    setClockOut(format(end, TIME_FORMAT));
  }

  function updatePTOHours(text: string) {
    setPtoHours(text);
    syncPTOTimes(text, ptoMinutes);
  }

  function updatePTOMinutes(text: string) {
    setPtoMinutes(text);
    syncPTOTimes(ptoHours, text);
  }

  async function save() {
    setError('');
    const dateParsed = parseDateKey(date);
    if (!dateParsed) {
      setError('Pick a valid date.');
      return;
    }
    const clockInDt = parseTimeString(date, clockIn);
    if (!clockInDt) {
      setError('Clock in time is required.');
      return;
    }
    const clockOutDt = parseTimeString(date, clockOut);
    if (clockOut.trim() && !clockOutDt) {
      setError('Clock out time is invalid.');
      return;
    }
    if (clockOutDt && clockOutDt <= clockInDt) {
      setError('Clock out must be after clock in.');
      return;
    }
    const lunchStartDt = parseTimeString(date, lunchStart);
    const lunchEndDt = parseTimeString(date, lunchEnd);
    if ((lunchStart.trim() && !lunchStartDt) || (lunchEnd.trim() && !lunchEndDt)) {
      setError('Lunch times are invalid.');
      return;
    }
    if (lunchStartDt && lunchEndDt && lunchEndDt <= lunchStartDt) {
      setError('Lunch end must be after lunch start.');
      return;
    }
    if (isPTO && (parseInt(ptoHours, 10) || 0) === 0 && (parseInt(ptoMinutes, 10) || 0) === 0) {
      setError('PTO must be at least 1 minute.');
      return;
    }

    setSaving(true);
    try {
      const settings = await getPaySettings();
      if (shift) {
        await updateShift({
          ...shift,
          date,
          clockIn: clockInDt.toISOString(),
          clockOut: clockOutDt?.toISOString(),
          lunchStart: lunchStartDt?.toISOString(),
          lunchEnd: lunchEndDt?.toISOString(),
          isHolidayPay,
          isPTO,
          notes: notes.trim() || undefined,
        });
      } else {
        await insertShift({
          date,
          clockIn: clockInDt.toISOString(),
          clockOut: clockOutDt?.toISOString(),
          lunchStart: lunchStartDt?.toISOString(),
          lunchEnd: lunchEndDt?.toISOString(),
          notes: notes.trim() || undefined,
          breaks: [],
          isHolidayPay,
          isPTO,
          hourlyRateSnapshot: settings.hourlyRate,
          overtimeEnabledSnapshot: settings.overtimeEnabled,
          overtimeMultiplierSnapshot: settings.overtimeMultiplier,
          overtimeThresholdSnapshot: settings.overtimeThresholdHours,
          taxPercentSnapshot: settings.taxPercent,
          holidayPayInOvertimeSnapshot: settings.holidayPayInOvertime,
          ptoInOvertimeSnapshot: settings.allowPTOInOvertime,
        });
      }
      hapticSuccess();
      bumpShifts();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[typography.heading, { color: colors.text }]}>
            {shift ? 'Edit Shift' : 'Add Shift'}
          </Text>

          <Pressable
            style={[styles.field, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setPicker({ mode: 'date', value: parseDateKey(date) ?? new Date() })}>
            <Calendar size={18} color={colors.primary} />
            <View>
              <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>Date</Text>
              <Text style={[typography.bodyMedium, { color: colors.text }]}>{dateDisplay}</Text>
            </View>
          </Pressable>

          {!isPTO ? (
            <>
              <View style={styles.row}>
                <TimeField
                  label="Clock in"
                  value={clockIn}
                  placeholder="9:00 AM"
                  onPress={() => openTimePicker('clockIn', clockIn)}
                />
                <TimeField
                  label="Clock out"
                  value={clockOut}
                  placeholder="5:00 PM"
                  onPress={() => openTimePicker('clockOut', clockOut)}
                />
              </View>
              <View style={styles.row}>
                <TimeField
                  label="Lunch start"
                  value={lunchStart}
                  placeholder="12:00 PM"
                  onPress={() => openTimePicker('lunchStart', lunchStart)}
                />
                <TimeField
                  label="Lunch end"
                  value={lunchEnd}
                  placeholder="12:30 PM"
                  onPress={() => openTimePicker('lunchEnd', lunchEnd)}
                />
              </View>
            </>
          ) : null}

          {isPTO ? (
            <View style={styles.row}>
              <Input
                label="PTO hours"
                value={ptoHours}
                onChangeText={updatePTOHours}
                keyboardType="number-pad"
                style={styles.rowItem}
              />
              <Input
                label="PTO minutes"
                value={ptoMinutes}
                onChangeText={updatePTOMinutes}
                keyboardType="number-pad"
                style={styles.rowItem}
              />
            </View>
          ) : null}

          <View style={styles.row}>
            <Button
              label="Holiday pay (8 hr)"
              variant={isHolidayPay ? 'primary' : 'secondary'}
              size="md"
              icon={<TreePine size={18} color={isHolidayPay ? colors.onPrimary : colors.text} />}
              style={styles.rowItem}
              onPress={applyHolidayPay}
            />
            <Button
              label="PTO"
              variant={isPTO ? 'primary' : 'secondary'}
              size="md"
              icon={<Umbrella size={18} color={isPTO ? colors.onPrimary : colors.text} />}
              style={styles.rowItem}
              onPress={applyPTO}
            />
          </View>

          <Input label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional notes" />
          {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
          <Button label={shift ? 'Save Changes' : 'Add Shift'} size="lg" loading={saving} onPress={save} />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </ScrollView>
      </View>

      {picker?.mode === 'date' ? (
        <DatePicker
          value={picker.value}
          mode="date"
          presentation="dialog"
          onValueChange={(_event: unknown, selected?: Date) => {
            setPicker(null);
            if (selected) setDate(toDateKeyLocal(selected));
          }}
          onDismiss={() => setPicker(null)}
        />
      ) : null}
      {picker?.mode === 'time' ? (
        <DatePicker
          value={picker.value}
          mode="time"
          is24Hour={false}
          presentation="dialog"
          onValueChange={(_event: unknown, selected?: Date) => {
            setPicker(null);
            if (selected) setTimeField(picker.field, selected);
          }}
          onDismiss={() => setPicker(null)}
        />
      ) : null}
    </View>
  );
}

function TimeField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.field, { borderColor: colors.border, backgroundColor: colors.background }]}
      onPress={onPress}>
      <View style={styles.fieldText}>
        <Text style={[typography.captionMedium, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyMedium, { color: value ? colors.text : colors.textMuted }]}>
          {value || placeholder}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  fieldText: {
    gap: 2,
  },
  rowItem: {
    flex: 1,
  },
});
