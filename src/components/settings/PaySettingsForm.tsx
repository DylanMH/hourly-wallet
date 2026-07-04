import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { savePaySettings } from '@/features/settings/settingsService';
import { hapticSuccess } from '@/lib/haptics';
import type { PayPeriod, PaySettings } from '@/lib/types';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const PAY_PERIODS: { label: string; value: PayPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Semi-monthly', value: 'semi-monthly' },
  { label: 'Monthly', value: 'monthly' },
];

type PaySettingsFormProps = {
  settings: PaySettings;
};

export function PaySettingsForm({ settings }: PaySettingsFormProps) {
  const { colors } = useTheme();
  const [hourlyRate, setHourlyRate] = useState(String(settings.hourlyRate));
  const [taxPercent, setTaxPercent] = useState(String(settings.taxPercent));
  const [overtimeEnabled, setOvertimeEnabled] = useState(settings.overtimeEnabled);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(
    String(settings.overtimeMultiplier)
  );
  const [overtimeThreshold, setOvertimeThreshold] = useState(
    String(settings.overtimeThresholdHours)
  );
  const [defaultLunch, setDefaultLunch] = useState(String(settings.defaultLunchMinutes));
  const [defaultBreak, setDefaultBreak] = useState(String(settings.defaultBreakMinutes));
  const [breakPaid, setBreakPaid] = useState(settings.breakPaidByDefault);
  const [holidayPayInOvertime, setHolidayPayInOvertime] = useState(settings.holidayPayInOvertime);
  const [allowPTOInOvertime, setAllowPTOInOvertime] = useState(settings.allowPTOInOvertime);
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(settings.payPeriod);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await savePaySettings({
        hourlyRate: parseFloat(hourlyRate) || settings.hourlyRate,
        taxPercent: parseFloat(taxPercent) || 0,
        overtimeEnabled,
        overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.5,
        overtimeThresholdHours: parseFloat(overtimeThreshold) || 40,
        defaultLunchMinutes: parseInt(defaultLunch, 10) || 30,
        defaultBreakMinutes: parseInt(defaultBreak, 10) || 15,
        breakPaidByDefault: breakPaid,
        holidayPayInOvertime,
        allowPTOInOvertime,
        payPeriod,
      });
      hapticSuccess();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[typography.heading, { color: colors.text }]}>Pay settings</Text>
      <Input
        label="Hourly rate"
        prefix="$"
        value={hourlyRate}
        onChangeText={setHourlyRate}
        keyboardType="decimal-pad"
      />
      <Input
        label="Estimated tax withholding (%)"
        value={taxPercent}
        onChangeText={setTaxPercent}
        keyboardType="decimal-pad"
      />
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>Overtime enabled</Text>
        <Switch value={overtimeEnabled} onValueChange={setOvertimeEnabled} />
      </View>
      {overtimeEnabled ? (
        <>
          <Select
            label="Overtime multiplier"
            value={
              overtimeMultiplier === '1.5' || overtimeMultiplier === '2'
                ? overtimeMultiplier
                : 'custom'
            }
            onChange={(v) => {
              if (v !== 'custom') setOvertimeMultiplier(v);
            }}
            options={[
              { label: '1.5x', value: '1.5' },
              { label: '2x', value: '2' },
              { label: `Custom (${overtimeMultiplier}x)`, value: 'custom' },
            ]}
          />
          <Input
            label="Custom multiplier"
            value={overtimeMultiplier}
            onChangeText={setOvertimeMultiplier}
            keyboardType="decimal-pad"
          />
          <Input
            label="Overtime threshold (hours/week)"
            value={overtimeThreshold}
            onChangeText={setOvertimeThreshold}
            keyboardType="decimal-pad"
          />
        </>
      ) : null}
      <Input
        label="Default unpaid lunch (minutes)"
        value={defaultLunch}
        onChangeText={setDefaultLunch}
        keyboardType="number-pad"
      />
      <Input
        label="Default break (minutes)"
        value={defaultBreak}
        onChangeText={setDefaultBreak}
        keyboardType="number-pad"
      />
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          Breaks paid by default
        </Text>
        <Switch value={breakPaid} onValueChange={setBreakPaid} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          Holiday pay counts toward overtime
        </Text>
        <Switch value={holidayPayInOvertime} onValueChange={setHolidayPayInOvertime} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>
          PTO counts toward overtime
        </Text>
        <Switch value={allowPTOInOvertime} onValueChange={setAllowPTOInOvertime} />
      </View>
      <Select label="Pay period" value={payPeriod} onChange={setPayPeriod} options={PAY_PERIODS} />
      <Text style={[typography.caption, { color: colors.textMuted }]}>Currency: USD</Text>
      <Button label={saved ? 'Saved' : 'Save pay settings'} loading={saving} onPress={save} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
