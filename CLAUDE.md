@AGENTS.md

# Android APK generation and client testing

This project is an Expo SDK 57 app. The release APK is built from the Android project in this repo and should be generated from the project root using the Expo Android workflow.

## 1) Required setup

Before generating an APK, make sure the Android toolchain is installed and working:

- Android SDK
- Java JDK
- Platform tools such as adb
- Proper Android device or emulator connected

Verify your device is visible:

```powershell
adb devices
```

If your phone is disconnected from USB, reconnect it and allow USB debugging.

## 2) Update the app version before each client test build

The release metadata lives in app.json. Update the app version and Android version code before shipping a new APK:

```json
"version": "1.0.1",
"android": {
  "package": "com.barberapp1.app",
  "versionCode": 2
}
```

For a new client test build, increase both values so Android treats it as a new release.

## 3) Build the release APK

From the project root:

```powershell
cd C:\CodeBase\barber-app
npx expo run:android --variant release
```

This will generate a release APK at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 4) Why Expo asks for a port

The port prompt is usually caused by an existing Metro dev server already running on the default Expo port. In this project, local servers may already be listening on 8081 or 8082. If that happens:

```powershell
npx expo start --clear --port 8082
```

Then build again. The port is only for local JavaScript bundling during development; it is not the Android app version or package name.

## 5) Install and test on a real Android phone

Install the APK manually:

```powershell
adb install -r C:\CodeBase\barber-app\android\app\build\outputs\apk\release\app-release.apk
```

Then start the app on the phone or use the installed app directly.

The app should work on the phone without the laptop remaining connected after installation, as long as the phone has internet access. The production backend is configured in src/services/api.ts and points to the public Render URL.

## 6) Client delivery checklist

- Confirm the app version is bumped in app.json
- Build a fresh release APK
- Install and test on a real device
- Verify the backend is reachable from the device over the internet
- Share the final APK with the client

## 7) Not a Play Store release yet

This command produces a local Android APK for testing and client delivery. It is not the same as a fully signed Play Store or enterprise distribution process. For app store distribution, use a proper keystore and signed build flow before publishing.

## 8) Machine-to-machine handoff instructions

This repository is intended to be cloned or pulled onto another machine and reused by another AI or human developer. To keep the setup consistent across machines:

1. Clone the repo and install dependencies with:

```powershell
cd C:\CodeBase\barber-app
npm install
npx expo install
```

2. Ensure Android Studio and SDK are installed on the new machine.

3. Confirm the device is connected and visible:

```powershell
adb devices
```

4. Use the same release flow:

```powershell
cd C:\CodeBase\barber-app
npx expo run:android --variant release
```

5. If Metro prompts for a port, restart Metro on a free port:

```powershell
npx expo start --clear --port 8082
```

6. Keep the backend URL and app metadata in sync with the live deployment. The app expects the public remote backend URL in src/services/api.ts and the release metadata in app.json.

7. If another AI is taking over, share the repo, this file, app.json, and src/services/api.ts as the core context for the build and release process.

This repository already contains the needed release context for continuation on another machine: app metadata, Android build flow, backend URL configuration, and APK generation steps.
