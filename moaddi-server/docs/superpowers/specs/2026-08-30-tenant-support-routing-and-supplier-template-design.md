# Tenant support routing + Supplier role template — Design

Date: 2026-08-30
Status: Approved for implementation (pending user review of this file)

## Goal

1. **Vendors** get a one-click **Supplier** role template (fill assigned machines), and when creating/editing staff who hold that kind of role they can assign the machines the person may fill.
2. **Shop Owners / Vendors** can configure **who receives Contact chat** by caller type on a shop (defaults) and optionally override per machine — unique audience per resource, with an **All** fallback lane.

## Decisions (from brainstorming)

- Message routing model: **B** — split by caller type (not platform-only).
- Where it lives: **3** — shop defaults + machine overrides.
- Lanes: Customers | Vendors | Shop owners | Staff | **All**; **unique** audience per shop/machine; **All** = fallback when no specific row matches.
- Supplier template: **Vendors only**.

## Why audience-keyed assignments (not extra scalar fields)

A growing set of `customerSupportUserId` / `vendorSupportUserId` / … fields does not scale and fights the “All + unique lanes” rule. A small list:

```ts
supportAssignments: { audience: SupportRouteAudience; userId: string }[]
```

keeps validation, UI, and resolver one shape for shop and machine.

## Data model

### New type

```ts
// Extends platform SUPPORT_AUDIENCES with catch-all "all"
type SupportRouteAudience =
  | 'customers'
  | 'vendors'
  | 'shopOwners'
  | 'staff'
  | 'all';

type SupportAssignment = {
  audience: SupportRouteAudience;
  userId: string; // same-tenant staff (existing tenantAssignment rules)
};
```

### Shops / Machines

- Add `supportAssignments: SupportAssignment[]` (default `[]`).
- Keep legacy `supportUserId` during rollout; migration copies non-null values to `{ audience: 'all', userId }`.
- After migration, writes go through `supportAssignments` only; reads may still expose a derived `supportUserId` (= `all` row or first row) for old clients if needed, then remove later.

### Validation (server)

- Array; each `audience` unique within the document.
- Each `userId` must pass existing same-tenant staff checks (`normalizeSupportUserId` / `userInTenant`).
- Empty list clears overrides (fall through to owner/vendor / platform).

### CASL `assigned-support`

Today: `{ supportUserId: user._id }`.

Update scope condition to match either legacy field **or** membership in `supportAssignments.userId` (Mongo `$or` / `$elemMatch`). Box/machine/shop list filters that rely on this scope must keep working for assignees on any lane.

## Resolver (`resolveSupportTarget`)

Caller audience = `audienceForRole(caller.role)` (existing helper), treating unknown as `customers` or `staff` as today.

Order (first non-self hit wins):

1. **Machine** (if `machineId`): row for caller audience → row `all` → (optional) keep vendor fallback **after** shop?  
   **Chosen:** machine specific → machine `all` → shop specific → shop `all` → machine `vendorId` → shop `ownerId` → platform audience agent → Super Admin.
2. Without `machineId` but with `shopId`: shop specific → shop `all` → shop `ownerId` → platform → Super Admin.
3. Neither: platform audience agent → Super Admin.

Clients **must** pass `shopId` / `machineId` when Contact is opened from those pages (machine product pages currently hard-target vendor — fix that).

## UI

### Roles (Vendor)

- Role create: **Use template → Supplier (fill machines)** presets matrix rows for Fill machines (`Box` + `assigned-machine`), matching `ruleChoices.js`.
- Template only visible when signed-in role is Vendor.

### Staff (Vendor)

- Show **Assigned machines** (`supplierMachineIds`) when:
  - creator is Vendor, **and**
  - selected role’s rules include any `assigned-machine` scope  
  (not only when role name is “Supplier”).
- **API:** `users.getById` (and edit load) returns `supplierMachineIds` from machines where `supplierIds` contains the user — edit form currently cannot show existing assignments.

### Shop / Machine edit

- Replace single Support picker with a small assignment editor:
  - Add row: audience select (remaining unused audiences) + staff reference.
  - Remove row / clear All.
- Labels in plain language: “When **Customers** Contact this shop/machine → **[staff]**”.

## Migration

One-off script (same style as `migrate-tenant-assignments.js`):

1. For each shop/machine with `supportUserId` and empty/missing `supportAssignments`, set `[{ audience: 'all', userId }]`.
2. Do not delete `supportUserId` until one release later (dual-read).

## Out of scope

- New platform built-in `Supplier` role (retired; stays a **tenant custom** template).
- Changing platform Super Admin “Answers for” audiences (remain last fallback).
- Shop Owner fill-machine templates.
- Per-conversation reassignment UI beyond Contact target resolution.

## Success criteria

- Vendor can create Supplier template role in one click and assign machines on staff create/edit; filler sees those machines via existing `assigned-machine` rules.
- Shop Owner can set different staff for Customers vs Vendors (etc.) on a shop; machine override wins for that machine.
- Customer Contact from a machine page reaches the machine’s customer (or All) assignee, not always the vendor.
- Existing single `supportUserId` shops/machines keep working after migration via `all` row.

## Spec self-review

- No unresolved placeholders.
- Compatible with existing `supplierIds` / `syncSupplierMachines` / tenant clamp.
- Resolver order and CASL `$or` called out explicitly.
- Migration + dual-read for `supportUserId` avoids a hard cutover.
