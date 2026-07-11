# Web-Only Gift Claim Flow

Lets a buyer share a "let someone else open it" link from the web locker, and lets
a recipient (guest or signed-in) claim the gift and open the vending box — reusing
the existing web `BoxGrid` socket flow.

**Scope:** all changes live in `moaddi-next`. `vending_app` and `moaddi-server` are
unchanged — the server gift endpoints already exist and are deployed
(`moaddi-server/app/routes/controllers/gifts.ts`), and this feature is purely a web
consumer of them.

---

## How it works (end to end)

```
Buyer (owner)                          Recipient (guest or signed-in)
─────────────                          ──────────────────────────────
locker page (BoxGrid)
  │ clicks "Let someone else open it"
  │ POST /purchases/:id/gift ──────────► { claimToken, ... }
  │ builds  origin/gift/<claimToken>
  │ share / copy ─────────────────────► opens /gift/<claimToken>
                                          │ GET /gifts/<token>        (preview)
                                          │ clicks "Claim & open"
                                          │ POST /gifts/<token>/claim (claim)
                                          │   → { session, purchase }
                                          │ persist guest session (cookie)
                                          │ redirect → /invoice/success?invoiceId=<purchase._id>
                                          ▼
                                        invoice route re-fetches purchase
                                        (GET /purchases/:id → canViewPurchase
                                         authorizes the opener) and renders
                                        <BoxGrid> → recipient opens the box
```

Two server rules make this work without any backend change:

- `GET /purchases/:id` uses `canViewPurchase`, which allows anyone in
  `gift.authorizedOpeners` — so the recipient's re-fetch on the invoice route
  succeeds.
- The socket box-open handlers use `isAuthorizedOpener` — so the recipient can
  actually open the box after claiming.

---

## Step-by-step changes

### 1. Endpoint helpers — `services/serverAddresses.js`

```js
// Gift-a-purchase (see moaddi-server/app/routes/controllers/gifts.ts).
export const giftEnableAPI = (purchaseId) =>
  `${address()}purchases/${enc(purchaseId)}/gift`;
export const giftPreviewAPI = (claimToken) =>
  `${address()}gifts/${enc(claimToken)}`;
export const giftClaimAPI = (claimToken) =>
  `${address()}gifts/${enc(claimToken)}/claim`;
```

### 2. Client gift service — `services/gift.js` (new)

Uses the **client** HTTP layer (`services/events`, cookie-based axios auth) because
it is called from client components. `serverDataProvider` is *not* used here — it is
server-only (`next/headers`). Since `events` lets axios throw on non-2xx, the service
surfaces the server's `{ message }` body.

```js
import { getRequest, postRequest } from "./events";
import { giftClaimAPI, giftEnableAPI, giftPreviewAPI } from "./serverAddresses";

const withMessage = (error, fallback) =>
  new Error(error?.response?.data?.message || error?.message || fallback);

// Owner/admin only, idempotent. Returns { claimToken, claimUrl, expiresAt }.
export const enableGift = async (purchaseId) => {
  try {
    const result = await postRequest(giftEnableAPI(purchaseId));
    if (!result?.claimToken) {
      throw new Error(result?.message || "Could not create the gift link.");
    }
    return result;
  } catch (error) {
    throw withMessage(error, "Could not create the gift link.");
  }
};

// Public preview. Throws on 404/410 (unknown/expired/collected).
export const getGiftPreview = async (claimToken) =>
  getRequest(giftPreviewAPI(claimToken));

// Anonymous → { session: <GuestSession>, purchase }. Signed-in → { session: null, purchase }.
export const claimGift = async (claimToken) => {
  try {
    const result = await postRequest(giftClaimAPI(claimToken));
    if (!result?.purchase) {
      throw new Error(result?.message || "Could not claim this gift.");
    }
    return result;
  } catch (error) {
    throw withMessage(error, "Could not claim this gift.");
  }
};
```

### 3. Share action — `app/(root)/components/BoxGrid.jsx`

`BoxGrid` now accepts a `customerId` prop and shows the share button **only to the
buyer**. The server's `POST /purchases/:id/gift` is owner/admin-only, so gating on
identity avoids a guaranteed 403 for recipients (who land on `BoxGrid` too and have
no matching `customerId`).

```jsx
const BoxGrid = ({ boxes, status, _id, machineId, machine, customerId }) => {
  const [sharing, setSharing] = useState(false);

  const isOwner =
    user?._id != null &&
    customerId != null &&
    String(user._id).toLowerCase() === String(customerId).toLowerCase();
  const liveBoxes = user?.purchase?.boxes ?? boxes ?? [];
  const canGift =
    isOwner &&
    ["PaymentDone", "Processing"].includes(status) &&
    liveBoxes.some(({ boxStatus }) => !boxStatus);

  const shareGift = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { claimToken } = await enableGift(_id);
      const url = `${window.location.origin}/gift/${claimToken}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: t("giftLinkShareTitle"),
            text: t("giftLinkShareText"),
            url,
          });
        } catch {
          /* user dismissed the native share sheet — no-op */
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("giftLinkCopied"));
      }
    } catch (e) {
      toast.error(e?.message || t("giftLinkError"));
    } finally {
      setSharing(false);
    }
  };
  // ...button rendered next to <BlockHeader> when `canGift`.
};
```

### 4. Thread `customerId` — `app/(root)/invoice/[status]/page.jsx`

`customerId` survives the response untouched (`normalizePurchase` spreads
`...purchase`), so the buyer's locker render can gate the share button.

```jsx
<BoxGrid
  _id={purchase._id}
  machineId={purchase.machineId}
  machine={purchase.machine}
  boxes={purchase.boxes}
  status={purchase.status}
  customerId={purchase.customerId}
/>
```

### 5. Claim page — `app/(root)/gift/[token]/page.jsx` (new)

A **client** component (it must persist the session and set cart context before
navigating). Previews the gift, claims it, persists a guest session for anonymous
recipients, then redirects into the existing locker UI.

```jsx
const onClaim = async () => {
  if (claiming) return;
  setClaiming(true);
  setError(null);
  try {
    const { session, purchase } = await claimGift(claimToken);

    // Persist the Guest session (cookie + axios auth) BEFORE navigating, so the
    // invoice route's server-side purchase re-fetch is authorized as the opener.
    // Signed-in claimers keep their own session (session === null).
    if (session) {
      const persisted = persistShopperSession(session, { defaultRole: "Guest" });
      setUser(persisted);
    }
    if (purchase?.machine) setMachine(purchase.machine);

    // Redirect by purchase _id (not invoiceId): the invoice route's fallback
    // GET /purchases/:id uses canViewPurchase, which authorizes gift openers —
    // the invoice-by-key route (canViewOrMutatePurchase) does not.
    router.push(`/invoice/success?invoiceId=${encodeURIComponent(purchase._id)}`);
  } catch (e) {
    setError(e?.message || t("claimError"));
    setClaiming(false);
  }
};
```

### 6. Messages — `messages/en.json` and `messages/ar.json`

Added share keys under `BoxGrid` (`letSomeoneOpen`, `creatingGiftLink`,
`giftLinkShareTitle`, `giftLinkShareText`, `giftLinkCopied`, `giftLinkError`) and a
new `Gift` namespace (`title`, `receivedHeading`, `receivedSubtitle`, `notReady`,
`items`, `claimAndOpen`, `claiming`, `backToHome`, `unavailable`, `claimError`).

---

## Design decisions

| Decision | Why |
|---|---|
| Share button gated on `user._id === customerId` | `POST /purchases/:id/gift` is owner/admin-only; recipients also render `BoxGrid`, so an ungated button would 403 for them. |
| Redirect by `purchase._id`, **not** `invoiceId` | `GET /purchases/invoice/:invoiceId` uses `canViewOrMutatePurchase` (rejects openers); `GET /purchases/:id` uses `canViewPurchase` (allows openers). `loadPurchaseForInvoiceKey` falls back to the by-id route, so `_id` works for guests; a real `invoiceId` would 403 then 404. |
| Client `events` layer, not `serverDataProvider` | Enable/claim run from client components; `serverDataProvider` is server-only. |
| Persist session **before** `router.push` | `persistShopperSession` writes the `user` cookie synchronously; the subsequent RSC navigation includes it, so the server re-fetch is authorized. |
| Build claim URL from `window.location.origin` | Keeps the recipient in the web app regardless of the server's configured `giftClaimBaseUrl`. |

---

## How to test

### 0. Setup

```bash
# Terminal 1 — server
cd moaddi-server
npm run dev   # or however it's normally started locally

# Terminal 2 — web
cd moaddi-next
pnpm dev
```

You need a **paid, active** purchase (`status` = `PaymentDone` or `Processing`) with
at least one unopened box, owned by a real account (not a guest) so it can act as
the buyer:

1. Sign in on the web app, go through checkout for one product, and pay (use the
   test/sandbox payment provider configured locally).
2. On success you land on `/invoice/success?invoiceId=<id>` rendering `BoxGrid`.
   Note the purchase `_id` from the URL/network tab — call it `<purchaseId>`.

If you'd rather not run a full checkout each time, flip an existing purchase's
status directly in Mongo:

```js
// mongosh, in the moaddi DB
db.purchases.updateOne(
  { _id: "<purchaseId>" },
  { $set: { status: "PaymentDone" } }
)
```

### 1. Buyer creates and shares a link (happy path)
1. Sign in as the buyer and open `/invoice/success?invoiceId=<purchaseId>`.
2. Confirm the **"Let someone else open it"** button appears next to the machine title.
3. Click it:
   - Mobile / share-capable browser → the native share sheet opens.
   - Desktop → a toast confirms the link was copied. Paste it: it should be
     `http://<origin>/gift/<claimToken>`.
4. Verify network: `POST /api/v1/purchases/<purchaseId>/gift` → `200` with
   `{ claimToken, claimUrl, expiresAt }`.
5. Click the button again (still signed in as buyer) → same `claimToken` comes
   back (idempotent, per `enableGift` in `moaddi-server/app/data/repos/purchases.ts:781`).

### 2. Guest recipient claims and opens (core flow)
1. Open the copied `/gift/<claimToken>` in a **clean browser profile / incognito**
   window (no `user` cookie).
2. `GET /api/v1/gifts/<claimToken>` fires on load → `200`. Preview card shows the
   machine name, item count, products, and price; no "Not ready" badge.
3. Click **"Claim & open"**. Verify:
   - `POST /api/v1/gifts/<claimToken>/claim` → `200` with a non-null `session`
     object (`role: "Guest"`, `isGuest: true`, `token`, ...) and `purchase`.
   - DevTools → Application → Cookies: a `user` cookie now exists for the site,
     containing that guest's `_id`.
   - `axios.defaults.headers.common.Authorization` is set (check any subsequent
     request — e.g. Network tab shows `Authorization: Bearer <token>` on the
     following requests).
   - You're redirected to `/invoice/success?invoiceId=<purchaseId>` (the
     **purchase `_id`**, not an invoice number) and it renders `BoxGrid`.
4. Click **Open** on a box → the socket publishes and the box flips to "Opened"
   (no "missing purchase context" / "invalid box slot" toast).
5. In the buyer's original tab/session, refresh the locker — the same box now
   shows as opened too (shared purchase state).

### 3. Signed-in recipient claims (no session replacement)
1. Sign in as a **different existing** user (not the buyer, not a fresh guest),
   then open `/gift/<claimToken>` (use a *different* claim link, or re-enable
   gifting on a fresh purchase — a purchase already fully claimed/opened by the
   guest in step 2 won't have unopened boxes left).
2. Claim → response has `session: null`.
3. Confirm the `user` cookie's `_id` is **unchanged** (still the signed-in user,
   not replaced with a guest).
4. You reach `BoxGrid` and can open a box.

### 4. Ownership gate
1. As the **recipient** on the resulting `BoxGrid` (from step 2 or 3), confirm
   the "Let someone else open it" button is **not** shown.
2. As the **buyer**, on the same purchase's locker page, confirm it **is** shown.
3. Sanity check the guard directly: with the recipient's session active, hit
   `POST /api/v1/purchases/<purchaseId>/gift` manually (e.g. via DevTools console
   `fetch` with the recipient's bearer token) and confirm the server returns
   `403 Forbidden` — this is what the UI gate is protecting against.

### 5. Unavailable / edge states (recipient sees a clear message, not a crash)

| Case | How to produce it | Expected |
|---|---|---|
| Unknown token | Visit `/gift/not-a-real-token` | `404` → "no longer available" card with a "Back to Home" button |
| Expired gift | In Mongo: `db.purchases.updateOne({_id:"<purchaseId>"},{$set:{"gift.expiresAt": new Date(Date.now()-3600000)}})` | `410` → unavailable card |
| Already collected | Mark all boxes opened, or `$set: {status: "Completed"}` | `410` → unavailable card |
| Not ready yet | `$set: {status: "PaymentDoneRequest"}` (not yet `PaymentDone`/`Processing`) | Preview loads normally but shows a **"Not ready yet"** badge; **Claim & open** button is disabled |
| Claim fails mid-flow | Kill the server after the preview loads, then click Claim | Inline error text (`t("claimError")` or server message), button re-enables, no redirect happens |

### 6. Regression — existing buyer locker flow
Complete a normal (non-gift) checkout and confirm the buyer still lands on
`BoxGrid` from `/invoice/success` and can open boxes exactly as before — this
change must not alter the non-gift path.

### 7. i18n
Switch locale to Arabic (`/ar/...`) and repeat step 2 (preview → claim → open).
Confirm:
- All new strings render in Arabic (`Gift.*` and the `BoxGrid.giftLink*` /
  `letSomeoneOpen` keys) — no raw `giftReceivedHeading`-style fallback text.
- Layout holds up RTL (button icon placement, card alignment).

### Lint / syntax
```bash
cd moaddi-next
npx eslint services/gift.js services/serverAddresses.js
npx next lint --dir "app/(root)/gift"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));JSON.parse(require('fs').readFileSync('messages/ar.json','utf8'));console.log('JSON OK')"
```

---

## Files touched
- `services/serverAddresses.js` — gift endpoint helpers
- `services/gift.js` *(new)* — client gift service
- `app/(root)/components/BoxGrid.jsx` — owner-gated share action
- `app/(root)/invoice/[status]/page.jsx` — passes `customerId` to `BoxGrid`
- `app/(root)/gift/[token]/page.jsx` *(new)* — claim screen
- `messages/en.json`, `messages/ar.json` — gift + share strings
