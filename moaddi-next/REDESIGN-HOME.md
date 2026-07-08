# Home Page Redesign — Phase 1 (UI only)

Re-skin of the home page to the new brand design from `moaddi-redesign.html`
(teal `#1FA3B8` + gold `#DBB44C`, from the Moaddi logo). **No logic was
changed** — all data fetching (`client()`, `useGetList`), props, routes, and
component contracts are exactly as before. Only markup and styling were
updated.

## Files updated

| File | What changed |
|------|--------------|
| `app/(root)/globals.css` | New design tokens (see below). This is the foundation for the whole redesign — every other page will pick up the new palette automatically wherever it uses `primary-*` / semantic tokens. |
| `app/(root)/layout.jsx` | One class: body background `bg-gray-100` → `bg-background` (mist `#F0F5F6`). |
| `app/(root)/page.jsx` | One class: `pb-12` on `<main>` for breathing room before the footer. Data/config untouched. |
| `app/(root)/components/blocks/Hero.jsx` | Full visual rebuild (same CMS props). Gradient brand band (teal-ink → deep teal → teal, rounded 24px) with decorative gold/white blobs, headline with the second CMS heading segment (`heading\|split`) rendered as a gold accent, description, white CTA button (CMS button title + url), and the device shot `public/images/hero.png` on desktop. CMS `features` now render as the "steps strip" — white cards with a teal-soft icon tile below the hero (previously the white bar overlapping the banner). |
| `app/(root)/components/BlockHeader.jsx` | New section-head pattern: bold 22px title + teal "Show more" link-button with direction-aware chevron. Removed the old `max-md:bg-primary` full-width colored bar on mobile. |
| `app/(root)/components/ProductCard.jsx` | New card pattern: 16px-radius surface card, hover lift + shadow (disabled under reduced-motion), product image on a soft muted tile, **gold** offer badge (`Badge variant="secondary"`) instead of red, teal price with muted strikethrough "was" price (was red), full-width primary "Show Machines" button. Same price/discount computation and link. |
| `app/(root)/components/CategoryCard.jsx` | Shop card switched from image-cover card to the redesign's horizontal tile: 56px rounded image + name + description, hover lift. Same `/shop/[id]` link. Removed the arrow button. |

## New token system (`app/(root)/globals.css`)

- **Primary scale** (`--color-primary-50…950`): violet → brand teal ramp.
  Key stops: `500 #1FA3B8` (actions), `600 #127285` (hover / deep),
  `900 #0E3A44` (teal ink — hero/footer gradients), `950 #10282E` (ink).
- **Secondary scale** (`--color-secondary-50…950`): sky → brand gold ramp.
  Key stops: `500 #DBB44C`, `100 #FAF3DF` (gold-soft), `700 #A8842A`
  (gold-deep). **Gold is reserved for offers / savings / low-stock only.**
- **shadcn semantic vars** (light theme):
  - `--primary #1FA3B8`, `--primary-foreground #fff`
  - `--secondary #FAF3DF` + `--secondary-foreground #A8842A` → `variant="secondary"` on Badge/Button is now the gold offer treatment
  - `--accent #E2F2F5` + `--accent-foreground #127285` → teal-soft ghost/quiet actions
  - `--background #F0F5F6` (mist), `--card #fff`, `--foreground #10282E` (ink)
  - `--muted #E7EEF0`, `--muted-foreground #5F787E`, `--border/--input #DDE8EA`
  - `--destructive #D64545`, `--ring #1FA3B8`
  - `--radius 0.5rem → 0.75rem` (cards `rounded-xl`/`rounded-2xl` ≈ the mock's 16px)

## Intentional deviations from the mock (to avoid touching logic)

- **Machines-near-you section** — needs a new machines query, so it's left
  for the next phase (`MachinesNearYou` block + `MachineCard`, per the
  Design-spec tab in the mock).
- **Hero stats / kicker / floating chips** ("240+ machines", "M-014 Olaya…")
  — hardcoded fake numbers in the mock; skipped until real counts are
  available from the API.
- **Hero CMS `background` image** — still fetched (prop untouched) but no
  longer rendered; the brand gradient replaces it. Content can be cleaned up
  in the CMS later.
- **Dark mode + header/footer redesign** — belong to the layout phase
  (`Header.jsx`, `Footer.jsx`, `ThemeContextProvider` toggle), not the home
  page.

## Verification

- `next lint`: the 7 touched files are clean (remaining warnings/errors are
  pre-existing in admin/dev files).
- Dev server renders `/` with the new UI against the live CMS.
- ⚠️ **Pre-existing build blockers (not from this change):** `next build`
  fails on (1) `Header.jsx` importing `navigationMenuLinkStyle`, which the
  updated `components/ui/navigation-menu.tsx` no longer exports, and
  (2) `PhoneInput.tsx` using `asChild` on the new base-ui `PopoverTrigger`.
  Both come from the shadcn/ui component updates already in the working tree
  before this redesign started. They need fixing before the next production
  build regardless of this re-skin.
