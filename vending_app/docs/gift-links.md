# Gift claim links (Universal / App Links)

A gift link is `https://server.moaddi-app.com/gift/<token>`. It's an **https**
URL so WhatsApp (and every other app) renders it as a tappable link, and it
opens the Moaddi app **directly** on the claim screen via iOS Universal Links /
Android App Links. If the app isn't installed, the same URL loads a small
landing page served by the server.

> Previously the share sheet emitted a `moaddi://gift/<token>` scheme URL, which
> WhatsApp shows as plain grey (untappable) text — that's the bug this fixes.

## How the pieces fit

| Piece | Location |
|-------|----------|
| Link base URL | `moaddi-server` env `GIFT_CLAIM_BASE_URL` → server returns `claimUrl` |
| iOS association file | `GET /.well-known/apple-app-site-association` (`app/routes/deeplinks.js`) |
| Android association file | `GET /.well-known/assetlinks.json` |
| Browser fallback page | `GET /gift/:token` |
| iOS app config | `ios.associatedDomains: ["applinks:server.moaddi-app.com"]` (`app.json`) |
| Android app config | `android.intentFilters` (autoVerify, host + `/gift`) (`app.json`) |
| Claim screen | `app/gift/[token].jsx` (already existed) |

The association files **must** be served from the same host as the link, over
https, with no redirect. They are mounted before `helmet` so no CSP interferes.

## Required credentials (fill to enable OS verification)

In `moaddi-server/env/dev.env`:
```
GIFT_CLAIM_BASE_URL='https://server.moaddi-app.com'   # already set
IOS_APP_ID='TEAMID.com.moaddi'         # replace TEAMID with your Apple Team ID
ANDROID_PACKAGE='com.moaddi'
ANDROID_SHA256_CERT_FINGERPRINTS=      # release signing SHA-256 (comma-sep)
```
- **Apple Team ID**: Apple Developer → Membership. The App ID is
  `<TeamID>.com.moaddi`.
- **Android SHA-256**: `eas credentials` (Android → keystore) or Play Console →
  *App integrity* → *App signing key certificate*. Add both the upload and
  Play-signing fingerprints if you use Play App Signing.

Until these are correct the OS won't verify the domain, so the link opens the
browser landing page instead of the app (still tappable — just an extra tap).

## After filling credentials — verify

1. New native build (config changed): `npx expo prebuild --clean` then EAS build.
2. Confirm the files are reachable:
   - `https://server.moaddi-app.com/.well-known/apple-app-site-association`
   - `https://server.moaddi-app.com/.well-known/assetlinks.json`
3. iOS: install via TestFlight/device build (Universal Links don't verify on
   Simulator). Android: `adb shell pm verify-app-links --re-verify com.moaddi`
   then check `adb shell pm get-app-links com.moaddi`.
4. Send yourself a gift, tap the WhatsApp link → app opens on the claim screen.
