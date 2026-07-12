#!/usr/bin/env bash
set -euo pipefail

# Build a local Android App Bundle (AAB) for Play Store release with a unique,
# timestamped filename so builds never overwrite each other.

cd "$(dirname "$0")/.."

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
export APP_VARIANT=production

BUILD_DIR="builds/production"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
OUTPUT_NAME="hourly-wallet-production-${TIMESTAMP}-${GIT_SHORT}.aab"

mkdir -p "$BUILD_DIR"

echo "Prebuilding Android project for production variant..."
npx expo prebuild --clean --platform android

echo "Building release AAB..."
cd android
./gradlew bundleRelease

echo "Copying AAB to ${BUILD_DIR}/${OUTPUT_NAME}..."
cp app/build/outputs/bundle/release/app-release.aab "../${BUILD_DIR}/${OUTPUT_NAME}"

echo "Done: ${BUILD_DIR}/${OUTPUT_NAME}"
