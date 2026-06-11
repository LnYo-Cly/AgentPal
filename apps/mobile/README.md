# AgentPal Mobile

AgentPal Mobile is an Expo React Native app for iOS and Android.

The web target is only a local smoke-test surface for fast layout checks. It is
not the product target and should not replace iOS/Android validation.

## Commands

```bash
npm install
npm run typecheck
npm run start
npm run android
```

`npm run start` expects a Development Build because AgentPal includes native
capabilities for pairing, secure storage, local cache, notifications, and future
voice input.

On Windows, Android can be run locally with Android Studio. iOS requires macOS
or EAS Build.

## Packaging

Android preview APKs can be built locally on Windows:

```bash
cd android
gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The generated APK is written to `android/app/build/outputs/apk/release/`.
Release builds currently use the checked-in debug keystore, so they are suitable
for side-loaded testing only, not app-store distribution.

iOS IPA builds cannot be produced locally on Windows. Use the EAS `preview`
profile after logging in to Expo and configuring Apple signing credentials:

```bash
npx eas-cli build --platform ios --profile preview
```
