# Guest Checkout (Web)

Scope: `moaddi-next` only. No changes to `moaddi-server` or `vending_app` — the
server already exposes `POST /users/guest` and `PUT /users/guest/me`, returns
a signin-shaped payload (`role: "Guest"`, JWT, `isGuest: true`), and merges
guest purchases into a real account on sign-in
(`moaddi-server/app/data/repos/users.js` → `mergeGuestPurchases`).

Anonymous shoppers can now browse machine/group products freely and only
choose "sign in" vs "continue as guest" at the checkout tap. Guest checkout
reuses the exact same purchase/payment/invoice path a signed-in customer
uses — nothing new was built there.

## New files

### `lib/shopper-session.js` — shared session write path

Sign-in, social sign-in, and guest creation all return the same
signin-shaped payload (`_id, role, token, expiresIn, ...`). Previously each
flow wrote the `user` cookie and axios auth header itself, with copy-pasted
logic. This is now the one place that does it:

```js
export function persistShopperSession(payload, { defaultRole } = {}) {
  const role = normalizeDashboardRole(payload.role) || defaultRole || payload.role;
  const expiryDays = (payload.expiresIn || 0) / 60 / 60 / 24 || 30;
  const expiresAt = moment().add(expiryDays, "days").toDate();
  const session = { ...payload, role, expiresIn: expiresAt.getTime() };

  Cookies.set("user", JSON.stringify(session), { expires: expiresAt });
  if (session.token) {
    axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
  }
  return session;
}
```

It intentionally does **not** touch `localStorage` — `CartProvider` already
mirrors `user` state there whenever `setUser(...)` is called, which covers
shopper roles (customer + guest). Dashboard roles (`Admin`/`Vendor`) are
written to `localStorage` by the caller instead, since they never go through
`setUser`.

### `services/guestAuth.ts` — guest API client

```ts
export async function createGuestSession(): Promise<GuestSession> {
  const response = await postRequest(guestSignInAddress());
  if (!response?.token) throw new Error(response?.message || "Could not start guest session.");
  return response;
}

export async function updateGuestInfo(info: GuestContactInfo) {
  return putRequest(guestMeAddress(), info);
}
```

New routes in `services/serverAddresses.js`:

```js
export function guestSignInAddress() {
  return `${address()}users/guest`;
}
export function guestMeAddress() {
  return `${address()}users/guest/me`;
}
```

### `app/(root)/components/GuestCheckoutDialog.tsx` — the checkout prompt

Two-step dialog: **choice** (`Sign in` / `Continue as guest`) → **form**
(phone required, name/email optional). The submit sequence matters — the
contact-info write requires the guest's own token, so the session must be
persisted *before* calling `updateGuestInfo`:

```ts
const handleSubmit = async (event: FormEvent) => {
  event.preventDefault();
  if (!phone || !isValidPhoneNumber(phone)) {
    toast.error(t("Auth.invalidPhoneNumber"));
    return;
  }

  const guest = await createGuestSession();                 // 1. POST /users/guest
  const session = persistShopperSession(guest, { defaultRole: "Guest" }); // 2. cookie + token live
  await updateGuestInfo({ phone, ...(name && { name }), ...(email && { email }) }); // 3. PUT /users/guest/me
  onGuestReady({ ...session, phone, name, email });          // 4. caller reruns purchase creation
};
```

## Changed files

### `lib/dashboard-role.js` — shopper role helpers

```js
/** Guest sessions come from POST /users/guest with role "Guest". */
export function isGuestRole(role) {
  return String(role ?? "").trim().toLowerCase() === "guest";
}

/** Customer-facing shopper: signed-in customer or anonymous guest. */
export function isShopperRole(role) {
  return isCustomerRole(role) || isGuestRole(role);
}
```

### `UserAuthForm.jsx` / `SocialAuthButtons.tsx` — migrated to the shared helper

Both flows collapsed their cookie/header-writing block down to one call:

```js
// before (duplicated in both files):
response.role = normalizeDashboardRole(response.role);
const expiryDays = response.expiresIn / 60 / 60 / 24;
const cookieExpiresAt = moment().add(expiryDays, "days").toDate();
response.expiresIn = cookieExpiresAt.getTime();
Cookies.set("user", JSON.stringify(response), { expires: cookieExpiresAt });
axios.defaults.headers.common.Authorization = `Bearer ${response.token}`;

// after:
const session = persistShopperSession(response);
```

Behavior is unchanged — this was a pure de-duplication so the cookie/header
write can't drift out of sync between the three producers (sign-in, social,
guest).

### Anonymous browse — gates removed

Five gates were found and removed (the original plan named three; two more
turned up while editing: the home-page machine card and the "machines near
you" block):

| File | What changed |
|---|---|
| `machine-products/page.jsx` | Removed the full-page `if (!user) return <Sign in to shop…>` block |
| `group-products/page.jsx` | Same, for groups |
| `(cardsList)/machines/MachinesPage.jsx` | Removed `if (!user) return router.push("/signin")` on machine-card click |
| `components/MachineCard.jsx` (home page) | Same |
| `components/blocks/MachinesNearYou.jsx` | Same |
| `components/Header.jsx` | Scan CTA now always links to `/machine-scan`, was `user ? "/machine-scan" : "/signin"` |

**Bug caught while removing these gates:** several of the same click
handlers did `setUser((prev) => ({ ...prev, machines: [response] }))`
unconditionally. For a signed-in user `prev` is a real object, so this is
fine — but for an anonymous user `prev` is `null`, and spreading `null`
plus adding `machines` produces a **fake truthy `user` object** with no
`_id`/`token`/`role`. That would have silently defeated the new
`if (!user) setGuestDialogOpen(true)` check downstream (the button would
think you're signed in and call `createPurchase` with an undefined customer
id). Fixed at every call site, including `MachineScan.jsx` which has no
gate at all and so is reachable anonymously right now:

```js
// before
setUser((prev) => ({ ...prev, machines: [response] }));

// after
if (user) setUser((prev) => ({ ...prev, machines: [response] }));
```

### Checkout — dialog wired into both purchase flows

`machine-products/page.jsx` and `group-products/page.jsx` both split their
single `onPurchaseHandler` into `createPurchase(forUser)` (pure, takes the
user explicitly) and a thin `onPurchaseHandler()` (decides whether to open
the dialog):

```js
const canPay = !!machine?._id && machine.products?.length > 0 && totalPrice > 0; // no longer requires `user`

const createPurchase = useCallback((forUser) => {
  // ...builds items, calls postRequest(purchasesAPI(), { customerId: forUser._id, ... })
}, [machine, totalPrice, total, setUser, persistMachineInCart]);

const onPurchaseHandler = useCallback(() => {
  if (!user) { setGuestDialogOpen(true); return; }
  createPurchase(user);
}, [user, createPurchase]);

const onGuestReady = useCallback((guestUser) => {
  setUser(guestUser);
  createPurchase(guestUser);   // <-- uses the guest object directly
}, [setUser, createPurchase]);
```

`createPurchase` takes `forUser` as a parameter rather than closing over the
`user` state on purpose: `setUser(guestUser)` is an async state update, so
if `onGuestReady` read `user` from `useCart()` instead, it could still be
`null` on the very next line. Passing the just-created guest object directly
sidesteps that race.

```jsx
<GuestCheckoutDialog
  open={guestDialogOpen}
  onOpenChange={setGuestDialogOpen}
  onGuestReady={onGuestReady}
/>
```

### Post-purchase UX now includes guests

- `app/(root)/profile/page.jsx` — gate switched from `isCustomerRole` to
  `isShopperRole`, so a guest cookie (`role: "Guest"`) is admitted to the
  shopper profile view instead of being redirected to `/admin`.
- `components/PurchaseStatusNotifier.jsx` — the "awaiting payment / ready to
  collect" popup and its background profile-sync poll switched from
  `isCustomerRole` to `isShopperRole`, so guests with an in-flight order get
  the same prompts a signed-in customer does.

### i18n

Added a `GuestCheckout` namespace to `messages/en.json` and
`messages/ar.json` (additive merge — the existing `Auth.*` social-login
strings were untouched):

```json
"GuestCheckout": {
  "title": "How would you like to check out?",
  "description": "Sign in to save your order history, or continue as a guest.",
  "continueAsGuest": "Continue as guest",
  "formTitle": "Contact info",
  "formDescription": "We use this to send your receipt and order updates.",
  "nameOptional": "Name (optional)",
  "emailOptional": "Email (optional)",
  "back": "Back",
  "continue": "Continue",
  "submitting": "Please wait…",
  "error": "Could not start guest checkout. Try again."
}
```

## Verification already done

- `npx tsc --noEmit` — clean.
- `npx eslint` on every touched `.ts`/`.tsx` file — clean.
- Playwright smoke test against the running dev server — all passed:
  - No sign-in gate text on `/machine-products` or `/group-products`.
  - `/machines` does not redirect anonymously.
  - Header scan CTA points at `/machine-scan`, not `/signin`.
  - `/profile` still correctly redirects a **fully** anonymous visitor (no
    cookie at all) to `/signin` — the existing protection wasn't loosened,
    only extended to guest sessions.

**Not verified in that pass:** the live `POST /users/guest` /
`PUT /users/guest/me` calls and a full payment run, because the dev server
used pointed at a remote API that CORS-blocks `localhost` — an environment
limitation, not a code issue. Use the manual steps below with a local
backend to cover that.

## How to test the new flow

Requires `moaddi-server` reachable from `moaddi-next` with CORS allowing
your dev origin (or point the `NEXT_PUBLIC_...` API env vars at a local
server instance).

1. **Anonymous browse** — open a private window, go to `/machines` or use
   the header scan button → `/machine-scan`. No redirect to `/signin`.
2. **Anonymous product view** — open `/machine-products?qr=<code>` or
   `/group-products?group=<id>` directly with no session. Products and the
   selection sidebar render; "Checkout" enables once you pick an item.
3. **Guest checkout dialog** — with items selected and no session, tap
   Checkout. `GuestCheckoutDialog` opens on the choice step.
   - **Sign in** → routes to `/signin`; current selection is preserved
     (it lives in page state, untouched by the dialog).
   - **Continue as guest** → phone-required form. Submitting an invalid
     phone shows the `invalidPhoneNumber` toast and does not call the API.
4. **Confirm the guest session** — submit a valid phone (+ optional
   name/email). In devtools → Application → Cookies, the `user` cookie
   should show `role: "Guest"`, `isGuest: true`, and a `token`. In Network,
   confirm the call order: `POST /users/guest` → `PUT /users/guest/me` →
   `POST /purchases`.
5. **Guest payment** — proceed through `/checkout` as normal
   (Stripe/Moyasar) — this path was not touched.
6. **Guest post-purchase** — confirm you land on the invoice/open-locker
   screen; refresh and confirm the purchase notifier still tracks the order.
7. **Guest `/profile`** — navigate to `/profile` as the guest; you should
   see the shopper overview, not a redirect to `/signin` or `/admin`.
8. **Regression — signed-in customer** — sign in with a real account and
   repeat steps 1–7; behavior should be identical to before this change
   (this exercises the shared-session refactor's highest-risk surface).
9. **Regression — social sign-in** — sign in via Google/Apple if configured
   locally; session should persist and `/` should load your profile.
10. **Regression — admin/vendor** — confirm `/admin` login and dashboard
    are unaffected.
