# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Google sign-in and Android release builds

Google sign-in requires an Android OAuth client in Google Cloud with the app
package `com.barberapp1.app` and the SHA-1 fingerprint of the certificate that
signed the installed APK. The release APK built on this machine on 9 November
2026 has SHA-1 `44:D2:32:1B:49:02:41:FD:E4:88:CC:7B:E2:AC:C5:8C:0E:83:82:5B`.
Verify the fingerprint again if the signing key or distribution method changes.
Debug, Play Store, and other signing keys require their own Android OAuth
clients. A `DEVELOPER_ERROR` means the Google Cloud configuration must be
checked; rebuilding the app alone does not configure Google Cloud.

Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the **web** OAuth client ID before
building the app. The backend must accept the same ID through
`GOOGLE_WEB_CLIENT_ID` or `GOOGLE_CLIENT_IDS`. Deploy the backend before
distributing an app using the `/auth/google/sign-in` endpoint. Existing users
sign in with their saved role; unknown accounts are directed to registration.
The older `/auth/google` endpoint remains available for older app versions.
See the [Google sign-in troubleshooting guide](https://react-native-google-signin.github.io/docs/troubleshooting).

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
