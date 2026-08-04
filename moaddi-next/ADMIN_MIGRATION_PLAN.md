# Admin MUI → shadcn/ra-core migration — remaining plan

## Status so far (Phase 1 complete)

Built a shadcn/ra-core kit replacing react-admin's MUI layer:

- `app/(admin)/components/kit/i18nProvider.js` — minimal english i18nProvider (replaces ra-language-english)
- `app/(admin)/components/kit/AdminUI.jsx` — `AdminCreateButton`, `AdminEditButton`, `AdminShowButton`, `AdminDeleteButton` (with confirm dialog), `AdminReferenceField`, `AdminNotifications` (ra-core notifications → sonner toasts), `AdminPageHeader`, `Spinner`, `humanize`
- `app/(admin)/components/kit/AdminList.jsx` — `AdminList` (replaces `<List>`), `AdminSelectFilter`, `AdminSearchFilter`, `AdminPagination`
- `app/(admin)/components/kit/AdminForm.jsx` — `AdminCreate`, `AdminEdit`, `AdminShow`, `AdminSimpleForm` (replaces `<Create>`/`<Edit>`/`<Show>`/`<SimpleForm>`, sticky save/delete toolbar)
- `app/(admin)/components/kit/inputs/AdminInputs.jsx` — `TextInput`, `NumberInput`, `PasswordInput`, `BooleanInput`, `SelectInput` (dual-mode: static `choices` or as `ReferenceInput` child), `ReferenceInput`, `ReferenceArrayInput` (chip toggles), `AutocompleteInput` (searchable combobox, dual-mode like SelectInput), `AutocompleteArrayInput`, `ImageInput` (self-contained upload/preview, no child needed), `ArrayInput` + `SimpleFormIterator` (built on `ra-core`'s `SimpleFormIteratorBase`/`SimpleFormIteratorItemBase` for correct index-scoped `source`), `DateInput`
- `app/(admin)/components/kit/inputs/AdminPhoneInput.jsx` — shadcn phone input (replaces `mui-tel-input`)
- `app/(admin)/components/kit/inputs/AdminRichTextInput.jsx` — tiptap-based `RichTextInput` (replaces `ra-input-rich-text`)
- `app/(admin)/components/AdminDetail.jsx` — added `AdminDetailFromColumns` (renders a `columns`-shaped array, same contract as `AdminShadcnTable`, as a Show-page field grid)
- `app/(admin)/components/AdminApp.jsx` — now uses `CoreAdmin`/`Resource`/`CustomRoutes` from `ra-core` instead of `react-admin`, plus the new `i18nProvider`
- `app/(admin)/components/layout/Layout.jsx` — replaced MUI-only `useTheme`/`ToggleThemeButton`/`LoadingIndicator`/`TitlePortal` with a local dark-mode toggle (localStorage + `.dark` class) and mounted `<AdminNotifications />`
- `app/(admin)/components/Dashboard.jsx`, `AdminShadcnTable.jsx` — swapped `react-admin` imports to `ra-core`

Resources fully migrated (List/Create/Edit/Show/index icon, zero `react-admin`/`@mui` imports):
**Machines, Vendors, Customers, Products, Shops, Groups**

Deliberately deferred: `app/(admin)/components/resources/machines/MachineControl.jsx` still imports MUI + `react-admin` (it's a large bespoke screen — box/QR/socket control panel). Left as-is for now; still renders fine since `react-admin`'s hooks are the same underlying `ra-core` contexts. Full rewrite is Phase 4.

## Next: verification before continuing

Before starting Phase 2, run and fix

```
cd moaddi-next
npx next build
```

Fix any type/import errors surfaced (most likely spots: `ReferenceInput` children expecting old prop shapes, `ArrayInput`/`SimpleFormIterator` field wiring on Machines' `GenaiInputs`, `AdminShadcnTable` column render functions touching removed MUI-only fields). Re-run until clean, then smoke-test in the browser (`/admin` login → Machines list/create/edit, Vendors create with phone input, Products create with image + currency select) via the `webapp-testing` skill or manual click-through, since automated build success doesn't prove the forms actually submit correctly against the real data provider.

Once verified, commit Phase 1 as its own commit before starting Phase 2 (keeps the diff reviewable).

## Phase 2 — Finance resources

Resources: **Payments, Invoices, Withdrawals, Wallets, Notifications**

Files to touch (per resource: `index.js` icon swap, `*List.jsx`, `*Show.jsx`, plus Create/Edit where they exist):

- `resources/payments/index.js`, `PaymentList.jsx`, `PaymentShow.jsx` — `PaymentIcon` → lucide `CreditCard`. `PaymentShow.jsx` is currently MUI (`Show`/`SimpleShowLayout` presumably) — rebuild on `AdminShow`/`AdminDetailFromColumns` like Customers.
- `resources/invoices/index.js`, `InvoiceList.jsx`, `InvoiceShow.jsx` — `ReceiptLongIcon` → lucide `ReceiptText`. `InvoiceList.jsx` has `SelectInput` filters (react-admin) — rebuild filters using `AdminSelectFilter` from `kit/AdminList.jsx`, passed via `<AdminList filters={...}>`.
- `resources/withdrawals/index.js`, `WithdrawalList.jsx`, `WithdrawalShow.jsx`, `WithdrawalCreate.jsx` — `AccountBalanceIcon` → lucide `Landmark`. **This is the most complex file in Phase 2**: `WithdrawalShow.jsx` has custom MUI `Dialog`s for Approve/Reject/Mark-paid actions with file upload. Rebuild those three dialogs on shadcn `Dialog` (see `app/(admin)/components/kit/AdminUI.jsx`'s `AdminDeleteButton` for the established shadcn-Dialog-with-confirm pattern to copy). Keep all the `axios.put(...)` / FormData logic identical — only the JSX shell changes. `WithdrawalCreate.jsx` uses `AutocompleteInput`+`ReferenceInput` for vendor picking (admin-only) and several `TextInput`s for bank details — direct kit swap. Also swap the MUI `Box`/`Typography` in `WithdrawalEmpty()`.
- `resources/wallets/index.js`, `WalletList.jsx`, `WalletShow.jsx` — `AccountBalanceWalletIcon` → lucide `Wallet`.
- `resources/notifications/index.js`, `NotificationList.jsx` — `NotificationsIcon` → lucide `BellRing`. (No Create/Edit/Show for this resource per `AdminApp.jsx`.)

Suggested execution: do Withdrawals yourself (dialogs need care), delegate Payments/Invoices/Wallets/Notifications to a background agent using the same prompt pattern as the Shops/Groups agent in this session (reference the now-larger set of completed examples, including Withdrawals for the filter-in-list pattern).

## Phase 3 — Site content resources

Resources: **Header (en/ar), Footer (en/ar), Blocks (en/ar), Website, SEO (en/ar), Pages (en/ar), Site (en/ar), Docs, PaymentProviders/PlatformFees**

These share patterns already solved by the kit:
- Rich text → `RichTextInput` from `kit/inputs/AdminRichTextInput.jsx` (Docs, Pages already use `ra-input-rich-text`)
- Nested arrays with `SimpleFormIterator` (Header sub-items, Footer links/bottomLinks, Blocks' per-block-type field sets, Website's socialMedia) → kit's `ArrayInput`/`SimpleFormIterator`, same as `GenaiInputs` in `MachineEdit.jsx`
- `ImageInput` for favicon/logo/hero/gallery images → kit's self-contained `ImageInput`, drop `ImageField` children
- Show pages using `ArrayField`+`DataTable` (Block/Website/FooterBody Show) → need a small new kit piece: an `AdminDetailArrayTable` that renders an array field as a mini shadcn `Table` inside a Show page (BlockShow/WebsiteShow/FooterBodyShow all do this for `socialMedia`/`links`/`bottomLinks`). Build this once, reuse across all three.
- `BlockEdit.jsx` is the largest file here (per-block-type field arrays keyed by `record.id` — Hero/Gallery/Service). Straightforward mechanical swap once `ArrayInput`/`ImageInput` patterns are proven, but long — good candidate for delegation.
- `HeaderEdit.jsx` has conditional field visibility (`onSelectChange` toggling hidden inputs) — same pattern as `MachineEdit.jsx`'s `showPassword`/`isGenai` state, already proven.
- `siteOptions/PlatformFeesEdit.jsx`/`PlatformFeesShow.jsx`/`PaymentProvidersList.jsx` — simple, quick.

Suggested execution: build the `AdminDetailArrayTable` kit piece yourself first (needed by 3+ files), then delegate the bulk of Header/Footer/Blocks/Website/SEO/Pages/Site/Docs/PaymentProviders to one or two background agents in parallel batches, each given the full list of completed examples (Customers for simple, MachineEdit for conditional fields + arrays, Withdrawals for dialogs) as reference.

## Phase 4 — Final cleanup

1. **`MachineControl.jsx` full rewrite** — the QR code + box grid + product-assignment control panel. Rebuild on shadcn: `Card`/`Button`/`Badge`/`Switch`/checkboxes already exist in `components/ui/`; keep all socket/business logic (`BoxApi`, `changeStatus`, `openAll`, `openSelected`, `RealTime`) untouched, only replace the MUI JSX shell (`Box`→`div`, `Grid`→CSS grid, `ButtonGroup`→flex button row, `Stack`→flex, `Tooltip`→shadcn `Tooltip`, `Checkbox`→shadcn checkbox or a styled native checkbox, `IconButton`→shadcn icon `Button`). This also lets `MachineShow.jsx` and this file drop their last `react-admin`/`@mui` imports.
2. **Delete `app/(admin)/theme.ts`** — no longer imported anywhere once MachineControl and MachineControl-adjacent MUI usage is gone. Grep to confirm.
3. **Root customer-app MUI cleanup** (separate from the admin dashboard, but same dependency removal goal):
   - `app/(root)/layout.jsx` — remove `AppRouterCacheProvider` from `@mui/material-nextjs`
   - `app/(root)/theme.js`, `app/(root)/context/Theme.jsx` — remove MUI `createTheme`/`ThemeProvider`; the app already has `DirectionProvider` for RTL, keep that, drop the MUI wrapper entirely (nothing under `app/(root)` besides `Contact.jsx`/`CardGrid.jsx`/`UserAuthForm.jsx` actually needs MUI theme once those three are fixed)
   - `app/(root)/components/Contact.jsx` — swap MUI `Button`/`TextField` for shadcn `Button`/`Input`/`Textarea`
   - `app/(root)/components/layout/CardGrid.jsx` — swap MUI `useMediaQuery` for a small custom `useMediaQuery` hook (or a `resize`/`matchMedia` based one — there's no shadcn equivalent, write a 10-line hook in `lib/`)
   - `app/(root)/components/UserAuthForm.jsx` — swap `mui-one-time-password-input` (`MuiOtpInput`) for a plain OTP component; shadcn doesn't ship an OTP input in this project's `components/ui/`, so either build a minimal 4-box OTP input or check if `input-otp` (a common headless dep) should be added — flag this as a small scoped decision rather than guessing silently.
4. **Drop dependencies from `package.json`** once all usages are gone: `@mui/material`, `@mui/material-nextjs`, `@mui/icons-material` (if listed — check, wasn't seen directly in deps but icons import from it so verify), `mui-tel-input`, `mui-one-time-password-input`, `react-admin`, `ra-input-rich-text`, `@emotion/react`, `@emotion/styled`, `@emotion/cache` (only needed by MUI's styling engine — confirm nothing else uses emotion directly first, e.g. `@kuma-ui` doesn't need it). Run `pnpm install` after removing to update the lockfile, then `npx next build` one final time.
5. **Final full-app smoke test**: log in as admin, click through every sidebar resource's List → Create → Edit → Show → Delete once; log in as vendor role and confirm the vendor-scoped subset of resources still renders; toggle dark mode; test the customer-facing signin/signup/OTP flow after the `UserAuthForm.jsx` OTP swap.

## Notes / gotchas learned this session

- `ra-core`'s `SimpleFormIteratorItemBase` is the mechanism that scopes a nested array row's `source` (e.g. `features.0.title`) via `SourceContext` — don't hand-roll index-prefixing, always compose `SimpleFormIteratorBase` + `SimpleFormIteratorItemBase` + `useArrayInput` as done in `kit/inputs/AdminInputs.jsx`'s `SimpleFormIterator`.
- `ra-core`'s `CoreAdmin`/`Resource` are drop-in for react-admin's `<Admin>`/`<Resource>` (react-admin literally wraps ra-core), so `AdminApp.jsx` needed almost no structural changes — just the import source and dropping the MUI-only `theme`/`darkTheme` props.
- `useTheme`, `ToggleThemeButton`, `LoadingIndicator`, `TitlePortal`, `FunctionField`, `ImageField`, `TextField`, `DataTable`, `List` (the UI component, not `ListBase`) are **MUI-only** — they live in `ra-ui-materialui`, not `ra-core`. Any file still using these needs a kit replacement or bespoke shadcn JSX, not just an import swap.
- The kit's `ImageInput` and `ReferenceArrayInput`/`AutocompleteArrayInput` are self-contained (no children needed) — every migrated file dropped the old `<ImageField>`/`<AutocompleteArrayInput>` child pattern.
- Title components (`const Title = () => <span>Edit X "{record.name}"</span>`) are unnecessary with the kit — `AdminForm.jsx`'s `AdminEdit`/`AdminCreate`/`AdminShow` auto-derive titles from `humanize(resource)` + `record.name`. Drop them during migration rather than porting.
