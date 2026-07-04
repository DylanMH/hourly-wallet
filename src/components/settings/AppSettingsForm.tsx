import React, { useState } from 'react';
import { Modal, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  exportData,
  importData,
  resetAllData,
  validateBackup,
} from '@/features/settings/dataService';
import {
  saveHapticsEnabled,
  saveNotificationsEnabled,
  saveThemePreference,
} from '@/features/settings/settingsService';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { requestNotificationPermission } from '@/lib/notifications';
import type { ThemePreference } from '@/lib/types';
import { useAppStore } from '@/state/appStore';
import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export function AppSettingsForm() {
  const { colors } = useTheme();
  const themePreference = useAppStore((s) => s.themePreference);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);

  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState('');

  async function handleNotificationsToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setMessage('Notification permission denied. Reminders stay off.');
        return;
      }
    }
    await saveNotificationsEnabled(enabled);
    setMessage('');
  }

  async function handleExport() {
    const json = await exportData();
    await Share.share({ message: json, title: 'Hourly Wallet backup' });
  }

  async function runImport() {
    try {
      const backup = validateBackup(importText);
      await importData(backup);
      hapticSuccess();
      setImportVisible(false);
      setImportText('');
      setImportError('');
      setMessage('Backup imported.');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed.');
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[typography.heading, { color: colors.text }]}>App settings</Text>

      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>Haptics</Text>
        <Switch value={hapticsEnabled} onValueChange={saveHapticsEnabled} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[typography.bodyMedium, { color: colors.text }]}>Notifications</Text>
        <Switch value={notificationsEnabled} onValueChange={handleNotificationsToggle} />
      </View>
      <Select<ThemePreference>
        label="Theme"
        value={themePreference}
        onChange={saveThemePreference}
        options={[
          { label: 'System', value: 'system' },
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
        ]}
      />

      <Button label="Export data (JSON)" variant="secondary" onPress={handleExport} />
      <Button
        label="Import data"
        variant="secondary"
        onPress={() => {
          setImportText('');
          setImportError('');
          setImportVisible(true);
        }}
      />
      <Button label="Reset all data" variant="danger" onPress={() => setConfirmReset(true)} />
      {message ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}

      <Modal visible={importVisible} transparent animationType="slide" onRequestClose={() => setImportVisible(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <Text style={[typography.heading, { color: colors.text }]}>Import backup</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Paste a Hourly Wallet backup JSON below. Importing replaces all current data.
              </Text>
              <Input
                value={importText}
                onChangeText={setImportText}
                multiline
                placeholder='{"app":"hourly-wallet", ...}'
              />
              {importError ? (
                <Text style={[typography.caption, { color: colors.danger }]}>{importError}</Text>
              ) : null}
              <Button label="Validate and Import" onPress={() => setConfirmImport(true)} />
              <Button label="Cancel" variant="ghost" onPress={() => setImportVisible(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmImport}
        title="Replace all data?"
        message="Importing this backup will overwrite your current shifts, bills, and settings. This cannot be undone."
        confirmLabel="Import and Replace"
        destructive
        onConfirm={() => {
          setConfirmImport(false);
          runImport();
        }}
        onCancel={() => setConfirmImport(false)}
      />

      <ConfirmModal
        visible={confirmReset}
        title="Reset all data?"
        message="This permanently deletes all shifts, bills, and payment history from this device. This cannot be undone."
        confirmLabel="Delete Everything"
        destructive
        onConfirm={async () => {
          setConfirmReset(false);
          await resetAllData();
          hapticWarning();
          setMessage('All data has been reset.');
        }}
        onCancel={() => setConfirmReset(false)}
      />
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  sheetContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
});
