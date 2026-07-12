#!/usr/bin/env bash
set -euo pipefail

# Build a local Android development APK with a unique, timestamped filename.
# This is a dev-client build; after installing, run `npx expo start` to use it.

cd "$(dirname "$0")/.."

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
export APP_VARIANT=development
export SENTRY_DISABLE_AUTO_UPLOAD=true

BUILD_DIR="builds/development"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
OUTPUT_NAME="hourly-wallet-development-${TIMESTAMP}-${GIT_SHORT}.apk"

mkdir -p "$BUILD_DIR"

echo "Prebuilding Android project for development variant..."
npx expo prebuild --clean --platform android

echo "Building debug APK..."
cd android
./gradlew assembleDebug

echo "Copying APK to ${BUILD_DIR}/${OUTPUT_NAME}..."
cp app/build/outputs/apk/debug/app-debug.apk "../${BUILD_DIR}/${OUTPUT_NAME}"

echo "Done: ${BUILD_DIR}/${OUTPUT_NAME}"
echo "Run 'npx expo start' and open the app on your device to develop."
