import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  title?: string;
  showLogo?: boolean;
  right?: React.ReactNode;
};

export function Screen({ children, scroll = true, style, title, showLogo, right }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = showLogo || title != null || right != null;

  const containerStyle = [
    styles.container,
    { backgroundColor: colors.background, paddingTop: insets.top },
    style,
  ];

  const header = hasHeader ? (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showLogo ? (
          <Image
            source={require('../../../assets/adaptive-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : null}
        {title ? (
          <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={containerStyle}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRight: {
    flexShrink: 0,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});
