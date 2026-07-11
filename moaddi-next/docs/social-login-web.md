# Google & Apple Sign-In (Web)

The web storefront mirrors the mobile app's social login end-to-end, hitting the
same server endpoint. Like mobile, it ships **disabled** — the buttons stay
hidden until the credential env vars are set.

- The Google button appears once `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set.
- The Apple button appears once `NEXT_PUBLIC_APPLE_SERVICES_ID` is set.

## How it works

1. The browser runs the provider's web flow and gets an **ID token**:
   - Google → [Google Identity Services](https://developers.google.com/identity/gsi/web)
     (`services/socialAuth.js → renderGoogleButton`, official button + popup).
   - Apple → [Sign in with Apple JS](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js)
     (`services/socialAuth.js → signInWithApple`, popup flow).
2. It POSTs `{ provider, idToken, name? }` to **`POST /api/v1/users/social`**.
3. The server verifies the token (`moaddi-server/app/services/social-auth.js`)
   and find-or-creates `_id = "<provider>-<sub>"` — the same guest-style user the
   mobile flow creates. It returns the usual signin payload (with JWT).
4. `components/SocialAuthButtons.jsx` persists the session exactly like the phone
   login (`user` cookie + axios Authorization header), hydrates the profile, and
   navigates home.

## Credentials to fill

### Client — `moaddi-next/.env` (or `.env.local`)
```
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=   # OAuth Web client id (token audience)
NEXT_PUBLIC_APPLE_SERVICES_ID=      # Apple "Services ID", e.g. com.moaddi.web
NEXT_PUBLIC_APPLE_REDIRECT_URI=     # a return URL registered on the Services ID
```

### Server — `moaddi-server/env/*.env`
```
GOOGLE_WEB_CLIENT_ID=      # must equal the web client id above
APPLE_CLIENT_ID=           # comma-separated audiences, e.g. com.moaddi,com.moaddi.web
```

## Important: Apple audiences differ by platform

Native iOS authenticates against the **app bundle id** (e.g. `com.moaddi`); the
web flow authenticates against a separate **Services ID** (e.g. `com.moaddi.web`).
The token's `aud` is whichever was used. The server's `APPLE_CLIENT_ID` therefore
accepts a **comma-separated list**, so list both to support mobile and web at
once. Google needs no such change — the web client id is already one of the three
Google audiences the server accepts.

## Notes
- Apple's web flow requires the Services ID's return URL to be registered in the
  Apple developer portal and to be reachable over HTTPS. Localhost testing needs
  a tunnel (e.g. an HTTPS dev domain), not `http://localhost`.
- Guest-purchase merge is phone-based; social accounts have no phone at creation,
  so nothing is merged until phone-linking is added later (same as mobile).
