#!/usr/bin/env bash
set -euo pipefail

# Build a local Android preview APK with a unique, timestamped filename so
# builds never overwrite each other.

cd "$(dirname "$0")/.."

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
export APP_VARIANT=preview
export SENTRY_DISABLE_AUTO_UPLOAD=true

BUILD_DIR="builds/preview"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
OUTPUT_NAME="hourly-wallet-preview-${TIMESTAMP}-${GIT_SHORT}.apk"

mkdir -p "$BUILD_DIR"

echo "Prebuilding Android project for preview variant..."
npx expo prebuild --clean --platform android

echo "Building release APK..."
cd android
./gradlew assembleRelease

echo "Copying APK to ${BUILD_DIR}/${OUTPUT_NAME}..."
cp app/build/outputs/apk/release/app-release.apk "../${BUILD_DIR}/${OUTPUT_NAME}"

echo "Done: ${BUILD_DIR}/${OUTPUT_NAME}"
