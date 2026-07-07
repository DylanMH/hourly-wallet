import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_VARIANT = process.env.APP_VARIANT ?? "production";

const getAppName = () => {
  if (APP_VARIANT === "development") return "hourly-wallet-dev";
  if (APP_VARIANT === "preview") return "hourly-wallet-preview";
  return "Hourly Wallet";
};

const getScheme = () => {
  if (APP_VARIANT === "development") return "hourlywallet-dev";
  if (APP_VARIANT === "preview") return "hourlywallet-preview";
  return "hourlywallet";
};

const getAndroidPackage = () => {
  if (APP_VARIANT === "development") return "com.dylanmh97.hourlywallet.dev";
  if (APP_VARIANT === "preview") return "com.dylanmh97.hourlywallet.preview";
  return "com.dylanmh97.hourlywallet";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "hourly-wallet",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: getScheme(),
  userInterfaceStyle: "automatic",

  ios: {
    ...config.ios,
    icon: "./assets/icon.png",
    bundleIdentifier:
      APP_VARIANT === "development"
        ? "com.dylanmh97.hourlywallet.dev"
        : APP_VARIANT === "preview"
          ? "com.dylanmh97.hourlywallet.preview"
          : "com.dylanmh97.hourlywallet",
  },

  android: {
    ...config.android,
    package: getAndroidPackage(),
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#E6F4FE",
    },
  },

  web: {
    ...config.web,
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-sqlite",
    "expo-secure-store",
    [
      "@sentry/react-native",
      {
        uploadSourceMaps: false,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    ...config.extra,
    appVariant: APP_VARIANT,
    sentryDsn: process.env.SENTRY_DSN,
    router: {},
    eas: {
      projectId: "f08f6c57-6c34-4476-afe8-e5868c413055",
    },
  },
});
