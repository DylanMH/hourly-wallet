import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn;
const enabled = typeof dsn === 'string' && dsn.length > 0;

export function initSentry() {
  if (!enabled) return;
  Sentry.init({
    dsn,
    enableNative: true,
    debug: __DEV__,
  });
}

export function captureException(error: unknown) {
  if (!enabled) return;
  Sentry.captureException(error);
}

export function captureMessage(message: string, level?: Sentry.SeverityLevel) {
  if (!enabled) return;
  Sentry.captureMessage(message, level);
}
