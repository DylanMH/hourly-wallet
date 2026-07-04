import React from 'react';
import { Text } from 'react-native';

import { AppSettingsForm } from '@/components/settings/AppSettingsForm';
import { JobManager } from '@/components/settings/JobManager';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/useTheme';
import { typography } from '@/theme/typography';

export default function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <JobManager />
      <AppSettingsForm />
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Hourly Wallet stores everything locally on your device. No account, no cloud.
      </Text>
    </Screen>
  );
}
