import React from 'react';
import { Text } from 'react-native';

import { AppSettingsForm } from '@/components/settings/AppSettingsForm';
import { PaySettingsForm } from '@/components/settings/PaySettingsForm';
import { Screen } from '@/components/ui/Screen';
import { useSettings } from '@/features/settings/useSettings';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();

  return (
    <Screen>
      <Text style={[typography.title, { color: colors.text }]}>Settings</Text>
      {settings ? <PaySettingsForm key={settings.updatedAt} settings={settings} /> : null}
      <AppSettingsForm />
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Hourly Wallet stores everything locally on your device. No account, no cloud.
      </Text>
    </Screen>
  );
}
