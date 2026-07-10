# Guest Checkout + Onboarding — Design Spec

_Date: 2026-07-07 · Codebases: `moaddi-server` (Node/Express/Mongoose), `vending_app` (Expo Router + RN)_

## Goal

Let un-signed-in users browse and **check out as guests**. At checkout tap, an
un-authenticated user sees a modal: **Login** or **Continue as guest**. Guests provide
**phone (required)**, **name (optional)**, **email (optional)**. When a guest later signs
up / logs in with the same phone, their guest purchases **merge** into the real account.
Add **first-launch onboarding** screens (skippable).

## Key constraint

In the Users model, `_id` **is the phone number** (signup/signin key on it; OTP is sent to
`_id.split("+")[1]`). A guest therefore **cannot** use the phone as its `_id` (a later real
signup with that phone would 409-collide). Guests get a synthetic id; the phone is stored as
a separate `phone` field used for merge lookup.

## Server design

### 1. Guest session — `POST /users/guest` (public, no auth)
Creates a user record: `_id: "guest-" + uuid`, `role: "Guest"`, `name: "Guest"`, random
bcrypt password (satisfies the required-password schema), `isActive: true`, `isGuest: true`,
`preferredCurrency` from the existing geo-currency service. Returns the same shape as
`signIn` (`{_id, name, role, preferredCurrency, token, expiresIn}`) with a long-lived JWT.
Because the guest holds a real JWT, **every existing purchase/payment/box/socket endpoint
works unchanged** — no unauthenticated payment paths, no webhook edits.

### 2. Guest contact info — `PUT /users/guest/me` (auth, Guest-only)
Saves `phone` (required, normalized to `+966…` like signup), `name`/`email` (optional) onto
the guest record. Guests can only update themselves.

### 3. Role plumbing
Add `'Guest'` to `requireRole` on `POST /purchases/complete`. In `purchaseAccess.ts`, treat
Guest exactly like Customer: view/mutate **only their own** purchases. Guests get nothing
else (staff routes stay gated by `requireRole`).

### 4. Merge by phone
Shared helper `mergeGuestPurchases(phone, realUserId)` in the users repo. Called on **OTP
verification** (activation) and on **signin** success: find `role: "Guest"` users whose
`phone` == the real user's `_id`, reassign their purchases' `customerId` to the real account,
soft-delete the guest records.

## App design

### 5. Guest auth plumbing
Add `guestAPI` address + `startGuestSession()` helper (calls `POST /users/guest`, stores
result via the normal `setUser` path so `httpClient` token attach + `UserContext` persistence
+ checkout screens all work). Export `isGuest = user?.role === "Guest"` from `UserContext`.

### 6. `GuestCheckoutModal` (new, moaddi `BottomSheet`)
Two steps: (a) choice — **Login** (→ `/Signin`) or **Continue as guest**; (b) guest form —
phone (required) + name/email (optional) via existing `PhoneInput`/`Input`. Submit →
create guest session → save contact info → close → re-run purchase. Wired into
`MachineProducts/[machineId].jsx` and `GroupProducts/[groupId].jsx`: no-user purchase opens
the modal instead of `router.navigate("/Signin")`. `GroupProducts` drops its mount-time
signin redirect. Returning guests (session stored) skip the modal.

### 7. Onboarding
`react-native-onboarding-swiper`, 3–4 pages (find/scan a machine → pick products → pay
in-app → grab items), Skip + Done, teal moaddi styling, i18n (en+ar). First-launch flag
`hasOnboarded` in AsyncStorage; root layout shows onboarding before `(tabs)` only when unset;
ends at Home.

### 8. Docs
Update `docs/redesign/REVIEW.md`, server docs, and memory `moaddi-redesign.md` with guest
checkout, merge-by-phone, and onboarding.
