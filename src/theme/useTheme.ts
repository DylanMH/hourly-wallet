import { useColorScheme } from 'react-native';

import { useAppStore } from '@/state/appStore';
import { darkColors, lightColors, ThemeColors } from '@/theme/colors';

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);

  const isDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  return { colors: isDark ? darkColors : lightColors, isDark };
}
