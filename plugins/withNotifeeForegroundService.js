const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

/**
 * Adds the Notifee foreground service to the Android manifest with
 * specialUse type and stopWithTask=false so the persistent clock-in
 * notification survives when the app process is killed.
 */
const withNotifeeForegroundService = (config) => {
  return withAndroidManifest(config, (config) => {
    const modResults = config.modResults;
    const manifest = modResults.manifest;

    AndroidConfig.Permissions.ensurePermissions(modResults, [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    ]);

    const application = manifest.application?.[0];
    if (!application) {
      throw new Error(
        "withNotifeeForegroundService: AndroidManifest is missing the application element",
      );
    }
    if (!application.service) {
      application.service = [];
    }

    const existingIndex = application.service.findIndex(
      (service) =>
        service.$?.["android:name"] === "app.notifee.core.ForegroundService",
    );

    const serviceEntry = {
      $: {
        "android:name": "app.notifee.core.ForegroundService",
        "android:foregroundServiceType": "specialUse",
        "android:stopWithTask": "false",
        "tools:replace": "android:foregroundServiceType,android:stopWithTask",
      },
    };

    if (existingIndex >= 0) {
      application.service[existingIndex] = serviceEntry;
    } else {
      application.service.push(serviceEntry);
    }

    // Make sure the tools namespace is available for merging.
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    return config;
  });
};

module.exports = withNotifeeForegroundService;
