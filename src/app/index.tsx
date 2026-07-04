import { Redirect } from 'expo-router';

import { useAppStore } from '@/state/appStore';

export default function Index() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
