# Moaddi App Redesign

Port of the Claude Design **"Moaddi App Redesign"** (a 20‑screen web/React + CSS design
system) into this Expo Router + React Native + NativeWind app.

- **Accent:** Teal (logo teal). Gold is available as an alternate.
- **Home layout:** V1 (gradient hero + service grid).
- **Font:** system for now (design calls for *IBM Plex Sans Arabic* — see follow‑ups).

---

## 1. Architecture

```
theme/moaddi.ts                     # design tokens (source of truth, RN constants)
tailwind.config.js                  # mirror palette under colors.moaddi.* (non-breaking)

components/moaddi/                   # design-system primitives (RN ports)
  Badge Button Card IconButton TopBar SectionHeader
  ServiceTile ShopCard ProductCard MachineCard Stepper BottomNav
  Separator Progress Avatar Switch ListItem Input(+PhoneInput)
  index.ts                          # barrel export

components/navigation/
  MoaddiTabBar.tsx                  # custom expo-router tab bar (uses BottomNav)
  DetailHeader.tsx                  # sticky back-header for detail/form screens

components/screens/
  PaymentResult.tsx                 # shared success/failure "ResultShell"

app/(tabs)/                         # bottom-tab shell (Home / Shops / Profile)
  _layout.tsx  index.tsx  shops.tsx  profile.tsx
app/new-design/                     # Home + Shops screen implementations
  HomeScreen.tsx  home/*  shops/ShopsScreen.tsx
```

### Design tokens (`theme/moaddi.ts`)
`palette`, `colors` (semantic aliases), `gradients`, `space`, `sizes`, `radius`,
`type` (typography), `shadow`, `status`. Primitives consume these via **inline styles**
(not NativeWind) so the design system is self-contained and portable.

> ⚠️ **NativeWind gotcha:** a **function** `style` on `Pressable`
> (`style={({pressed}) => ...}`) is silently dropped in this project (NativeWind 4).
> Always use static object/array styles in primitives; use `android_ripple` for press
> feedback. This caused the shop-card/button rendering bug and is now fixed everywhere.

---

## 2. Bottom tabs

Idiomatic expo-router `(tabs)` **route group** (URL-transparent, so `/` still resolves
to Home and existing deep links are unaffected). A custom `tabBar` renders the design's
`BottomNav`. Other screens (Shop, Machine, Checkout…) push **over** the tabs from the
parent `<Stack>` in `components/Stacks.jsx`, where `name="index"` was replaced by
`name="(tabs)"`. The tab bar is **flat** (Android `elevation: 0`, hairline top border) —
matches the design, not a raised material bar.

---

## 3. Screens

All detail/form screens hide the native stack header via an in-screen
`<Stack.Screen options={{ headerShown:false }} />` and render `DetailHeader`.
**Business logic (auth, payments, BLE, sockets, camera, VAT) was preserved** — only the
presentation changed.

| Screen | Route file | Logic preserved |
|---|---|---|
| Home (V1) | `app/(tabs)/index.tsx` → `app/new-design/HomeScreen.tsx` | admin redirect, OTP redirect, live shops/products |
| Shops | `app/(tabs)/shops.tsx` → `app/new-design/shops/ShopsScreen.tsx` | `shopsActive` fetch |
| Shop detail | `app/Shop/[shopId].jsx` | `useManyReference("machines")`, `Fit.image`, machine-context `setInfo` |
| Machine products | `app/MachineProducts/[machineId].jsx` | **all** BLE/purchase logic (types 0–5, `useBlu*`, `onPurchaseHandler`); only `DefaultView`/`MachineProductCard` restyled |
| Checkout success ×2 | `CheckoutMoyasar/success`, `CheckoutStripe/success` | nav + i18n |
| Checkout failure ×2 | `CheckoutMoyasar/failure`, `CheckoutStripe/failure` | params, retry nav |
| Box unlock | `app/BoxGrid.jsx` | socket `publishData`, `boxUpdateHandler`, done/next-machine effects |
| Invoice | `app/Invoice/[invoiceId].jsx` | `computeInvoiceSubtotal/TotalTax`, `getProductPricing`, QR |
| QR scan | `app/MachineQRScan.tsx` | `expo-camera`, `onBarcodeScanned`, group/machine routing; + torch |
| Sign in | `app/Signin.tsx` | existing `PhoneInput`/`PasswordInput`, `signInAddress` flow |
| Staff sign in | `app/SigninAsStaff.tsx` | same login flow, staff header |
| Sign up | `app/Signup.tsx` | `signUpAddress`, OTP redirect |
| OTP | `app/OTP.jsx` | `react-native-otp-entry` auto-submit, `otpAddress` |
| Profile | `app/Profile.jsx` | purchases stats, logout, dual tab/stack (back hidden when `!canGoBack`) |
| Settings | `app/Settings.tsx` | delete-account confirm, language modal, dark toggle |
| Purchase history | `app/PurchaseHistory.jsx` | `purchases` query, filter chips, Invoice nav |
| Staff wallet | `app/staff/Wallet.jsx` | vendor gating, wallet + transactions APIs, refresh |
| Withdrawals list | `app/staff/WithdrawalsList.jsx` | withdrawals API, proof-image preview modal |
| Withdrawal request | `app/staff/WithdrawalRequest.jsx` | validation + `withdrawalCreateAPI` |

### Not yet redesigned (still functional, untouched)
`Checkout.jsx`, `CheckoutMoyasar/index.jsx`, `CheckoutStripe/index.jsx` (payment **SDK**
sheets — the design's manual card form doesn't match the SDK reality),
`ProfileSetting.jsx`, `GroupProducts/[groupId].jsx`.

---

## 4. i18n

All keys referenced by the redesign are now present in **both** `lib/locales/en.json` and
`lib/locales/ar.json` (verified at parity — 207 keys each, no key used in code is missing,
no orphaned key). This includes the redesign additions (`darkMode`, `notifications`,
`orderUpdatesViaWhatsapp`, `aboutMoaddi`, `thisActionCannotBeUndone`, `staffAccount`,
`forVendorsAndOperators`, `verifyYourNumber`, `enterTheCode`, `otpSentMessage`,
`didntReceiveIt`, `resend`, `boxList`, `box`, `tapBoxToOpen`, `enjoyYourItems`, `of`,
`open`, `waitingForApprove`, `requestsReviewedWithin2Days`, `noInvoiceData`, `items`) plus
some pre-existing gaps that were surfaced and filled (`settings`, `noMachines`,
`machineDetected`, `notYourMachine`, `bluetooth[2-5]Control`).

To re-verify after future edits: extract `t("…")` keys from `app/` + `components/` and diff
against the locale files (see the verification snippet used in the redesign notes).

---

## 5. Verification

`npx tsc --noEmit` is clean on all `.tsx` (only a pre-existing `tsconfig` `baseUrl`
deprecation remains). **Note:** `.jsx` route files are not type-checked (`checkJs` off) —
verify those by running the app.
