# Gift a Purchase — Design (Approach A)

Date: 2026-07-11
Status: In implementation

## Goal

Let user **A** buy a product from a vending machine and generate a **shareable
claim link** so that **either A or a recipient B** can walk up to the machine and
open the box. The link/code is the authorization (a bearer voucher) — B does not
need a pre-existing Moaddi account.

## Decisions (from brainstorming)

- **Core model:** gifting a paid purchase. A pays in full; B (or A) collects.
- **Recipient identification:** shareable claim link/code (A sends it to B).
- **Who can open:** BOTH A (owner) and B (claimant).
- **Open semantics:** one open per box, whoever arrives first. A multi-box
  purchase naturally supports several opens. Completion is unchanged
  (`Processing` → `Completed` when all boxes opened).
- **B's authorization:** the link/code alone authorizes opening. No account
  required. If B is signed in, their account is recorded instead of a throwaway
  guest.

## Why Approach A

Every box-open path today gates on `purchase.customerId === user._id`
(`events.js`: `controlCustomer`, `controlBluetooth1Machine`,
`bluetoothMachineComplete`; `purchaseAccess.ts` for view/complete). To let B
open, B's request must satisfy those gates for a gifted purchase — without an
account.

The app already has a **Guest role** and `users.createGuest()` that returns a
real DB user + JWT so "every existing authenticated endpoint (purchases,
payment, boxes, sockets) works unchanged." We reuse it: claiming a gift
auto-creates a Guest session (zero friction for B) and records that guest's id
as an **authorized opener** on the purchase. HTTP and socket auth then need no
special casing — B behaves like a normal guest who happens to be allowed to open
this one purchase.

## Data model

`purchases.gift` (embedded, optional):

| field               | type       | meaning                                            |
| ------------------- | ---------- | -------------------------------------------------- |
| `isGift`            | Boolean    | owner enabled sharing                              |
| `claimToken`        | String     | random bearer token embedded in the link           |
| `sharedAt`          | Date       | when the link was generated                        |
| `expiresAt`         | Date?      | optional TTL (only if `GIFT_LINK_TTL_HOURS` set)   |
| `authorizedOpeners` | [String]   | user/guest ids allowed to open besides the owner   |
| `claimedAt`         | Date?      | last claim time                                    |

Index: `{ "gift.claimToken": 1 }` (sparse).

## Authorization

`lib/purchaseAccess.ts`:
- `isAuthorizedOpener(purchase, userId)` = owner match **OR** `userId` in
  `gift.authorizedOpeners`.
- `canViewPurchase(...)` = `canViewOrMutatePurchase(...)` **OR** opener.
  Used for GET routes so B can view the purchase. **Mutate/delete stays
  owner/admin/vendor only** — B never deletes A's purchase over HTTP; B opens
  boxes over the socket.

Open gates in `events.js` switch from `customerId == user._id` to
`isAuthorizedOpener(purchase, user._id)`, still requiring status in
`["PaymentDone","Processing"]`. A new `controlGuest` handler (mirror of
`controlCustomer`) is added so networked/MQTT machines resolve a handler for the
`Guest` role.

## Endpoints

- `POST /api/v1/purchases/:purchaseId/gift` — **auth: owner or Admin.** Purchase
  must be paid (`PaymentDone`/`Processing`). Generates `claimToken` if absent
  (idempotent), sets `isGift`, `sharedAt`, optional `expiresAt`. Returns
  `{ claimToken, claimUrl }`.
- `GET /api/v1/gifts/:claimToken` — **public.** Preview for B's claim screen:
  machine + boxes + item summary + status. 404 if token unknown; 410 if the
  purchase is already `Completed` or the link expired.
- `POST /api/v1/gifts/:claimToken/claim` — **optional auth.** Validates token +
  paid/not-completed/not-expired. If a valid JWT is present, records that user
  as opener; otherwise `createGuest()` and records the guest. Returns
  `{ token, purchase, machine, boxes }` (guest JWT when anonymous). B's app then
  opens the box through the existing socket `ControlRequest` flow.

## Config

`config.giftClaimBaseUrl` = `GIFT_CLAIM_BASE_URL` || `APP_WEB_URL` || `''`.
`claimUrl` = `${base}/gift/${claimToken}` when a base is configured, else null
(client can still use the raw token).
`GIFT_LINK_TTL_HOURS` optional; unset = link valid until the purchase completes.

## Out of scope for the server slice (follow-up)

- Web (`moaddi-next`) claim page at `/gift/[token]` + a "Share gift" button on a
  paid purchase.
- Mobile (`vending_app`) share sheet (WhatsApp) + claim/open screen.

## Testing

- Owner enables gift on a paid purchase → token returned; re-enabling returns the
  same token.
- Enabling on an unpaid/completed purchase → 409/410.
- Anonymous claim → guest JWT minted, opener recorded, preview matches purchase.
- B (guest) opens over socket `ControlRequest` → `controlGuest` authorizes,
  box opens, purchase advances to `Processing`/`Completed`.
- A still opens normally; second opener on an already-collected box is a no-op.
- Non-owner cannot enable gift; unknown/expired token rejected.
</content>
</invoke>
