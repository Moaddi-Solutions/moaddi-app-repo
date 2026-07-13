# Moaddi Redesign — Overall Review & Improvement Areas

_Reviewer notes after porting the design system + ~28 screens (consumer + full staff section)._

## Staff section — created from scratch

The entire staff section (`app/staff/`, `components/staff/`) did **not exist** before the redesign work.
All screens were built new using moaddi primitives and design tokens:

| Screen / Component | What was built |
|---|---|
| `app/staff/index.jsx` | Tab shell: Home \| Dashboard tabs via `BottomNav`, auth guard |
| `components/staff/Home.jsx` | Shop list with `ShopCard` rows, native Stack header |
| `components/staff/Dashboard.jsx` | Gradient hero + staff stats + `ServiceGrid` quick actions + shop list |
| `components/staff/MachineCard.jsx` | `MachineCard` primitive + `BottomSheet` with 3 quick actions (Open, Fill, View Products) |
| `app/staff/shop/[shopId].jsx` | `DetailHeader` + machine list for a shop |
| `app/staff/Machines/[productId].jsx` | `DetailHeader` + machine list for a product |
| `app/staff/Profile.jsx` | `Avatar` + `Badge` + `ListItem` actions, logout `AlertDialog` |
| `app/staff/Wallet.jsx` | Gradient balance header, transaction list |
| `app/staff/WithdrawalsList.jsx` | Withdrawal history |
| `app/staff/WithdrawalRequest.jsx` | Withdrawal form |
| `app/staff/BoxGrid.jsx` | Box status grid, real-time socket updates |
| `components/moaddi/BottomSheet.tsx` | New slide-up sheet primitive (react-native-modal) |
| `components/moaddi/Loader.tsx` | New loading indicator primitive (teal ActivityIndicator + optional message, `flex` prop for full-screen use) |
| `components/staff/Stacks.jsx` | Stack navigator with custom logo header + QR / language / profile actions |

## Guest checkout + onboarding (added 2026-07-07)

Un-signed-in users can browse and check out as **guests** (spec:
`docs/superpowers/specs/2026-07-07-guest-checkout-onboarding-design.md`).

| Piece | What was built |
|---|---|
| `POST /users/guest` (server) | Public endpoint mints a `role:"Guest"` user (synthetic `_id`, real JWT) so all existing authenticated endpoints work unchanged |
| `PUT /users/guest/me` (server) | Guest-only; saves phone (required) + name/email (optional) for merge-by-phone |
| `mergeGuestPurchases` (server) | On OTP-activation & signin, reassigns guest purchases to the real account (matched by phone) and soft-deletes the guest |
| `components/GuestCheckoutModal.jsx` | moaddi `BottomSheet` — Login or Continue-as-guest (phone required); shown at checkout tap in `MachineProducts` + `GroupProducts` |
| `services/guest.js` | `startGuestSession` / `saveGuestInfo` helpers |
| `app/Onboarding.tsx` | First-launch (AsyncStorage `hasOnboarded`) paged intro; teal gradient slides, Skip/Next/Get-started |

Note: `GroupProducts` no longer redirects to `/Signin` on mount — guests browse
freely; auth is only prompted at checkout tap.

## What's solid
- **Single source of truth** for tokens (`theme/moaddi.ts`) mirrored into Tailwind; screens
  read tokens, not magic numbers.
- **Logic preserved** — auth, payment SDKs, BLE, sockets, camera, and VAT math were left
  intact; only presentation changed. Low regression risk on money/hardware flows.
- **Idiomatic navigation** — URL-transparent `(tabs)` group keeps every existing deep link
  working.
- **Type-safe** primitives; clean `tsc`.

## Known gaps / risks
1. **`.jsx` screens aren't type-checked** (`checkJs` off). Shop/Machine/Box/Invoice/auth
   logic edits are unverified by the compiler — must be exercised at runtime.
2. ~~**Missing i18n keys** render as raw keys.~~ **Done** — en/ar locale files are now at
   parity (207 keys each); every `t()` key used in code resolves. See README §4.
3. **Font not loaded** — design is *IBM Plex Sans Arabic*; app uses system font.
4. **Dark mode**: tokens are light-only. Settings/Profile expose a dark toggle, but the
   moaddi tokens don't have a dark variant, so redesigned screens stay light in dark mode.
5. **Two parallel UI kits** now exist: `components/ui/*` (shadcn/NativeWind) and
   `components/moaddi/*`. Risk of drift/confusion.
6. **Dead files**: `app/new-design/Hero.tsx`, `app/new-design/ShopsScreen.tsx` are unused;
   component files under `app/new-design/**` are technically routes.

## Recommended next steps (prioritized)

### P0 — correctness & polish
- ~~**Add the missing i18n keys** (en + ar) so nothing shows raw keys.~~ ✅ done (en/ar at parity).
- **Run the app** on device and walk every redesigned screen; fix the `.jsx` runtime issues
  the compiler can't catch.
- **Load IBM Plex Sans Arabic** via `expo-font`; set `fontFamily` in `theme/moaddi.ts`.

### P1 — completeness
- **Redesign the Checkout SDK screens** (`CheckoutMoyasar/index`, `CheckoutStripe/index`)
  by wrapping the SDK payment sheet in the new `Card`/`Button` chrome — keep the SDK, restyle
  the surroundings (don't rebuild the card form).
- **`ProfileSetting`** (edit form) and **`GroupProducts`** to the design.
- ~~**Wire the Home hero "language" button** to `LanguageSelectorModal` (the old stack header
  had it; it's currently a no-op).~~ ✅ done (2026-07-08, see session log).

### P2 — quality & consistency
- **Dark theme tokens**: add a dark palette to `theme/moaddi.ts` and switch via
  `useColorScheme`, or gate the dark toggle off until supported.
- **RTL**: the app is bilingual; audit `flexDirection`/`textAlign`/icon direction for Arabic
  (`I18nManager.isRTL`). `DetailHeader` back chevron and list chevrons should flip.
- **Consolidate UI kits**: decide whether `components/moaddi/*` supersedes `components/ui/*`
  for app screens; migrate or document the boundary to prevent drift.
- **Accessibility**: add `accessibilityRole`/labels to cards acting as buttons; ensure hit
  targets ≥44px (tokens already define `hit-min`).
- **Currency formatting**: `Intl.NumberFormat` instead of `toFixed(2)` + code, for locale
  grouping and correct RTL currency placement.

### P3 — hygiene
- Delete dead `app/new-design/Hero.tsx` and `app/new-design/ShopsScreen.tsx`.
- Move non-route components out of `app/new-design/**` into `components/` so they aren't
  registered as routes.
- Add `"ignoreDeprecations": "6.0"` (or migrate off `baseUrl`) to silence the lone tsc note.
- Consider a lightweight snapshot/RTL test for the primitives.

## Suggested effort map
| Item | Impact | Effort |
|---|---|---|
| i18n keys | High | Low |
| Runtime walkthrough | High | Low–Med |
| Font loading | Med | Low |
| Checkout SDK restyle | High | Med |
| Dark tokens | Med | Med |
| RTL audit | High (ar users) | Med |
| UI-kit consolidation | Med | Med–High |

---

## Session log — 2026-07-08 (bug fixes + home wiring)

### New screens
| Route | File | What it does |
|---|---|---|
| `/Products` | `app/Products.tsx` → `app/new-design/products/ProductsScreen.tsx` | All active products (on live machines) in a 2-col `ProductCard` grid; tap → `/Machines/[productId]`. `DetailHeader` + `productsActive` data. |
| `/Search` | `app/Search.tsx` → `app/new-design/search/SearchScreen.tsx` | Live product search: autofocus search bar filters `productsActive` by name as you type; results as 2-col `ProductCard` grid; tap → `/Machines/[productId]`. |

Both registered headerless in `components/Stacks.jsx` (they render their own `DetailHeader`/search bar).

### Home page — dead controls wired (`app/new-design/HomeScreen.tsx`)
The home primitives all wired `onPress` correctly, but `HomeScreen` never passed the handlers down. Now:
- **Globe icon** (`HeroHeader.onLanguage`) → opens `LanguageSelectorModal` (reused from Settings).
- **Search pill** (`HeroHeader.onSearch`) → `/Search`.
- **Service grid** now passes all four: **Scan** → `/MachineQRScan`, **Shops** → `/(tabs)/shops`, **Products** → `/Products`, **Orders** → `/PurchaseHistory` (previously only Scan + Orders were wired, so the Shops/Products tiles were dead).
- **"View all"** actions wired: Shops section → `/(tabs)/shops`, Special Products section → `/Products` (were empty `() => {}`).

### Bug fixes
- **Checkout crash / Stripe "Card details not complete"** — `ActivityIndicator` was used but not imported in `app/CheckoutStripe/index.jsx`, `app/CheckoutMoyasar/index.jsx`, `components/CheckoutMoyasarContent.jsx`. On Stripe, the missing import threw during the `processingPayment` re-render, unmounting `<CardField>` mid-confirm → the SDK reported the card incomplete. Added the import to all three.
- **HTTP requests could hang forever** — RN `fetch` has no timeout, so a stalled/unreachable server left buttons spinning indefinitely (seen in guest checkout). Added `fetchWithTimeout` (30s `AbortController`) in `services/httpClient.js` and routed all POST/PUT/GET/DELETE through it; timeouts now surface a clear error that existing `catch` blocks use to reset loading state.
- **Bottom sheets covered by keyboard** — wrapped the shared `components/moaddi/BottomSheet.tsx` content in a `KeyboardAvoidingView` (padding on iOS), so every bottom sheet (guest checkout form, staff actions, …) lifts above the keyboard.

### Product lists — one card per row (2026-07-08)
Changed the product displays from a 2-column grid to a single full-width column (one `ProductCard` per row) in `app/Shop/[shopId].jsx`, `app/new-design/products/ProductsScreen.tsx`, and `app/new-design/search/SearchScreen.tsx`. `ProductCard` fills its container when `width` is omitted; removed the now-unused `useWindowDimensions`/`cardWidth` from the Shop page.

### Stock level indicator on product cards (2026-07-08)
Each `ProductCard` now shows a colored stock badge in the image's top-right corner:
🟢 **In stock** (>3) · 🟠 **Low stock** (1–3, `LOW_STOCK_THRESHOLD`) · 🔴 **Out of stock** (0).
When a product is out of stock the whole card dims (`opacity 0.55`) and its action button is disabled and relabeled **Unavailable**, so guests can't start a checkout that would fail.

**Stock definition.** Locker machines have no per-box quantity — each `boxes` doc is one slot (`isFilled` boolean). A product's sellable stock = count of **active, non-deleted boxes in an active machine** pointing at it. This matches how `MachineProducts`/`GroupProducts` already derive "available" (active boxes), scoped to live machines so offline/disabled machines don't inflate the count.

| Piece | Change |
|---|---|
| `moaddi-server` `data/repos/products.ts` → `getActive` | Computes a derived `stock` number per product from the joined `boxes`+`machines`, and strips those heavy arrays from the response (client only needs the count). Powers `productsActive`. |
| `components/moaddi/ProductCard.tsx` | New optional `stock?: number \| null` prop (omit → no badge). Renders the tone badge, dims + disables at 0. Now uses `t()` for `inStock`/`lowStock`/`outOfStock`/`unavailable` + `showMachines` default label. |
| `lib/locales/en.json` + `ar.json` | Added `inStock` / `lowStock` / `outOfStock` / `unavailable` (en + ar). |
| `products/ProductsScreen`, `search/SearchScreen`, `home/SpecialProducts` | Pass `stock={item.stock}` from the `productsActive` response. |
| `app/Shop/[shopId].jsx` | Passes `stock` computed client-side from each product's already-present `boxes` (active count). |

Scope: aggregate stock (across all live machines) on the list/search/home cards; the Shop card reflects the deduped machine entry's active boxes. `MachineProducts`/`GroupProducts` keep their existing per-machine "available N" text (unchanged).
