# Gift claim links (Universal / App Links)

A gift link is `https://www.moaddi-app.com/gift/<token>` — the **web app**
(moaddi-next) claim page. It's an **https** URL so WhatsApp (and every other
app) renders it as a tappable link, and it opens the Moaddi app **directly** on
the claim screen via iOS Universal Links / Android App Links. If the app isn't
installed, the recipient simply continues on the web claim page — no dead end.

> Previously the share sheet emitted a `moaddi://gift/<token>` scheme URL, which
> WhatsApp shows as plain grey (untappable) text and which does nothing for
> people without the app — that's the bug this fixes. Legacy
> `https://server.moaddi-app.com/gift/<token>` links now 302-redirect to the
> web claim page (and are still intercepted by the app when installed).

## How the pieces fit

| Piece | Location |
|-------|----------|
| Link base URL | `moaddi-server` env `GIFT_CLAIM_BASE_URL` (= web origin) → server returns `claimUrl` |
| iOS association file | `GET /.well-known/apple-app-site-association` (moaddi-next `app/api/well-known/.../route.js` + rewrite in `next.config.ts`; legacy copy in moaddi-server `app/routes/deeplinks.js`) |
| Android association file | `GET /.well-known/assetlinks.json` (same two places) |
| Browser fallback | web claim page `moaddi-next/app/(root)/gift/[token]/page.jsx`; legacy server host 302-redirects there |
| iOS app config | `ios.associatedDomains`: `server.moaddi-app.com`, `moaddi-app.com`, `www.moaddi-app.com` (`app.json`) |
| Android app config | `android.intentFilters` (autoVerify, all three hosts + `/gift`) (`app.json`) |
| Claim screen | `app/gift/[token].jsx` (already existed) |
| Mobile share fallback | `app/BoxGrid.jsx` builds `WEBSITE_URL/gift/<token>` when the server returns no `claimUrl` |

The association files **must** be served from the same host as the link, over
https, with no redirect — that's why moaddi-next serves its own copies for
`moaddi-app.com` (route handlers behind a `/.well-known/*` rewrite, since
app-router folders can't start with a dot).

## Required credentials (fill to enable OS verification)

In `moaddi-server/env/dev.env` **and** the moaddi-next deployment env (the web
association route handlers read the same variable names):
```
GIFT_CLAIM_BASE_URL='https://www.moaddi-app.com'  # web app origin (server only)
# NOTE: use the `www` host — the apex https://moaddi-app.com has no TLS cert.
IOS_APP_ID='VYHX753Y3N.com.moaddi'     # TeamID.bundleId (already set)
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
2. Confirm the files are reachable on BOTH hosts:
   - `https://www.moaddi-app.com/.well-known/apple-app-site-association`
   - `https://www.moaddi-app.com/.well-known/assetlinks.json`
   - `https://server.moaddi-app.com/.well-known/apple-app-site-association`
   - `https://server.moaddi-app.com/.well-known/assetlinks.json`
   Each must return the REAL App ID (`VYHX753Y3N.com.moaddi`, not
   `TEAMID.com.moaddi`) — set `IOS_APP_ID` in each deployment's env.
3. iOS: install via TestFlight/device build (Universal Links don't verify on
   Simulator). Android: `adb shell pm verify-app-links --re-verify com.moaddi`
   then check `adb shell pm get-app-links com.moaddi`.
4. Send yourself a gift, tap the WhatsApp link → app opens on the claim screen.
