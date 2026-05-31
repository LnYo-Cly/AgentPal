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
