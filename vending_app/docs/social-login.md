# Google & Apple Sign-In

Social login is wired end-to-end but ships **disabled** — all credential env
vars are empty. The Google button stays hidden until a web client ID is set;
the Apple button shows on iOS builds. Fill the values below to enable it.

## How it works

1. The app runs the native provider flow and gets an **ID token**
   (`services/socialAuth.ts`).
2. It POSTs `{ provider, idToken, name? }` to **`POST /api/v1/users/social`**.
3. The server verifies the token against the provider
   (`app/services/social-auth.js`) and find-or-creates a user with
   `_id = "<provider>-<sub>"` — mirroring the guest pattern, so no phone or
   password is needed (`data/repos/users.js → socialSignIn`).
4. It returns the same signin-shaped payload (with JWT) as phone/password login.

## Credentials to fill

### Server — `moaddi-server/env/dev.env`
```
GOOGLE_WEB_CLIENT_ID=      # Web OAuth client (token audience)
GOOGLE_IOS_CLIENT_ID=      # iOS OAuth client
GOOGLE_ANDROID_CLIENT_ID=  # Android OAuth client
APPLE_CLIENT_ID=           # App bundle id, e.g. com.moaddi
```
A Google token's `aud` must match one of the three Google IDs, or verification
returns 401. A provider whose ID(s) are unset returns **501**.

### Client — `vending_app/.env`
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=   # REQUIRED by the native SDK on both platforms
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=   # iOS only
```

### Client — `vending_app/app.json`
Replace the Google plugin's `iosUrlScheme` placeholder with your reversed iOS
client ID (from `GoogleService-Info.plist`, the `REVERSED_CLIENT_ID` value):
```
"iosUrlScheme": "com.googleusercontent.apps.<your-ios-client-id>"
```

## After filling credentials

These are native modules — you must create a **new dev/EAS build** (they do not
run in Expo Go):
```
npx expo prebuild --clean
eas build --profile development --platform all   # or run:android / run:ios
```

## Notes
- Apple's "Sign in with Apple" is required on iOS if you offer other social
  logins (App Store guideline 4.8). The Apple button is iOS-only by design.
- Guest-purchase merge is phone-based; social accounts have no phone at
  creation, so nothing is merged until phone-linking is added later.
