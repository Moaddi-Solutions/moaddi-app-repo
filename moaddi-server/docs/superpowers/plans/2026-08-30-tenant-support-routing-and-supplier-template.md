# Tenant Support Routing + Supplier Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendors get a Supplier role template and machine assignment on staff forms; shops/machines get audience-keyed `supportAssignments` (unique lanes + All) with shop defaults and machine overrides for Contact routing.

**Architecture:** Replace scalar `supportUserId` with `supportAssignments: { audience, userId }[]` on shops and machines; migrate legacy values to `{ audience: 'all', userId }`. Resolver picks machine-specific → machine all → shop-specific → shop all → vendor/owner → platform agent → Super Admin. Vendor Role create gains a Supplier matrix preset; staff forms show machine picker when the selected role includes `assigned-machine`.

**Tech Stack:** Node/Express (moaddi-server), Mongoose, CASL, Next.js admin (moaddi-next / ra-core), Expo vending_app ContactTarget.

**Spec:** `moaddi-server/docs/superpowers/specs/2026-08-30-tenant-support-routing-and-supplier-template-design.md`

## Global Constraints

- Vendor-only Supplier template (not Shop Owner).
- Audiences: `customers` | `vendors` | `shopOwners` | `staff` | `all`; unique per document.
- Assignees must pass existing same-tenant staff validation (`userInTenant`).
- Do not revive built-in `Supplier` role; template creates a tenant custom role.
- Dual-read `supportUserId` during rollout; do not delete the field in this plan.
- Commit only when the user asks (repo rule); skip commit steps unless requested.

## File map

| File | Responsibility |
|------|----------------|
| `moaddi-server/app/lib/roles.ts` | `SUPPORT_ROUTE_AUDIENCES` (+ `all`) |
| `moaddi-server/app/lib/tenantAssignment.js` | `normalizeSupportAssignments` |
| `moaddi-server/app/lib/ability.ts` | `assigned-support` matches assignments |
| `moaddi-server/app/data/models/shops.js` (+ `.ts`) | `supportAssignments` schema |
| `moaddi-server/app/data/models/machines.js` (+ `.ts`) | same |
| `moaddi-server/app/data/repos/shops.js` / `machines.js` | normalize on create/update |
| `moaddi-server/app/routes/controllers/options.js` | `resolveSupportTarget` |
| `moaddi-server/app/data/repos/users.js` | return `supplierMachineIds` on getById |
| `moaddi-server/db/migrate-support-assignments.js` | backfill from `supportUserId` |
| `moaddi-next/.../SupportAssignmentsInput.jsx` | admin assignment editor |
| `moaddi-next/.../ShopEdit.jsx` / `MachineEdit.jsx` | wire editor |
| `moaddi-next/.../roleTemplates.js` + `RoleCreate.jsx` | Supplier template |
| `moaddi-next/.../makeUserResource.jsx` | show machines when role has `assigned-machine` |
| `moaddi-next/.../machine-products/page.jsx` | Contact via support-target + `machineId` |
| `vending_app` machine Contact entry points | same |

---

### Task 1: Route-audience types + normalizeSupportAssignments

**Files:**
- Modify: `moaddi-server/app/lib/roles.ts`
- Modify: `moaddi-server/app/lib/tenantAssignment.js`
- Test: `moaddi-server/app/lib/tenantAssignment.test.js` (create if missing; use `node --test` / `tsx --test` like ability tests)

**Interfaces:**
- Produces: `SUPPORT_ROUTE_AUDIENCES`, `isSupportRouteAudience`, `normalizeSupportAssignments(rows, tenantId) => Promise<SupportAssignment[]>`

- [ ] **Step 1: Add route audiences to roles.ts**

After `SUPPORT_AUDIENCES`, add:

```ts
export const SUPPORT_ROUTE_AUDIENCES = [
  ...SUPPORT_AUDIENCES,
  'all',
] as const;

export type SupportRouteAudience = typeof SUPPORT_ROUTE_AUDIENCES[number];

export const isSupportRouteAudience = (
  value: unknown,
): value is SupportRouteAudience =>
  SUPPORT_ROUTE_AUDIENCES.includes(value as SupportRouteAudience);
```

- [ ] **Step 2: Write failing tests for normalizeSupportAssignments**

Create `moaddi-server/app/lib/tenantAssignment.test.js` that mocks Users lean queries (or uses a thin pure validation path). Cover:

1. `null` / `undefined` / `[]` → `[]`
2. Duplicate `audience` → 400
3. Unknown audience → 400
4. Empty `userId` rows dropped or rejected (reject)
5. Valid unique rows → deduped string ids
6. Missing `tenantId` with non-empty rows → 400 (same message style as support)

- [ ] **Step 3: Implement normalizeSupportAssignments in tenantAssignment.js**

```js
const { isSupportRouteAudience } = require("./roles");

const normalizeSupportAssignments = async (rows, tenantId) => {
  if (rows == null) return [];
  if (!Array.isArray(rows)) {
    throw notFound("supportAssignments must be an array.");
  }
  if (!rows.length) return [];
  if (!tenantId) {
    throw notFound("Cannot assign support without a tenant owner.");
  }
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const audience = row?.audience;
    const userId = row?.userId == null ? "" : String(row.userId).trim();
    if (!isSupportRouteAudience(audience)) {
      throw notFound(`Unknown support audience "${audience}".`);
    }
    if (seen.has(audience)) {
      throw notFound(`Duplicate support audience "${audience}".`);
    }
    if (!userId) {
      throw notFound("Each support assignment needs a userId.");
    }
    const id = await normalizeSupportUserId(userId, tenantId);
    if (!id) {
      throw notFound("Each support assignment needs a userId.");
    }
    seen.add(audience);
    out.push({ audience, userId: id });
  }
  return out;
};
```

Export it from `module.exports`.

- [ ] **Step 4: Run tests**

Run: `cd moaddi-server && npx tsx --test app/lib/tenantAssignment.test.js`  
(or `node --test` if pure JS). Expected: PASS.

---

### Task 2: Schemas + migration

**Files:**
- Modify: `moaddi-server/app/data/models/shops.js`, `shops.ts`, `machines.js`, `machines.ts`
- Create: `moaddi-server/db/migrate-support-assignments.js`

**Interfaces:**
- Consumes: none new
- Produces: documents may have `supportAssignments: [{ audience, userId }]`

- [ ] **Step 1: Add schema field (JS + TS models)**

```js
supportAssignments: {
  type: [
    {
      audience: { type: String, required: true },
      userId: { type: String, required: true },
    },
  ],
  default: [],
},
```

Keep existing `supportUserId`.

- [ ] **Step 2: Migration script**

Mirror `db/migrate-tenant-assignments.js` dotenv + `config.mongodb.uri`:

```js
// For shops and machines:
// if supportUserId set AND (no supportAssignments or empty):
//   $set: { supportAssignments: [{ audience: 'all', userId: String(supportUserId) }] }
```

Log modified counts. Do not unset `supportUserId`.

- [ ] **Step 3: Run migration against env/dev.env**

Run: `cd moaddi-server && node db/migrate-support-assignments.js`  
Expected: Connected; counts printed; done.

---

### Task 3: CASL assigned-support + resolveSupportTarget

**Files:**
- Modify: `moaddi-server/app/lib/ability.ts` (`SCOPE_CONDITIONS['assigned-support']`)
- Modify: `moaddi-server/app/routes/controllers/options.js`
- Modify: `moaddi-server/app/lib/ability.test.ts`, `accessibleFilter.test.ts`

**Interfaces:**
- Consumes: `supportAssignments` on shop/machine docs
- Produces: updated `resolveSupportTarget({ callerId, shopId, machineId, role })`

- [ ] **Step 1: Update assigned-support condition**

```ts
'assigned-support': (user) => ({
  $or: [
    { supportUserId: String(user._id) },
    { 'supportAssignments.userId': String(user._id) },
  ],
}),
```

- [ ] **Step 2: Helper pickAssignee(assignments, audience)**

In `options.js` (or small `app/lib/supportTarget.js`):

```js
const pickFromAssignments = (assignments, audience) => {
  const rows = Array.isArray(assignments) ? assignments : [];
  const specific = rows.find((r) => r.audience === audience);
  if (specific?.userId) return String(specific.userId);
  const all = rows.find((r) => r.audience === 'all');
  if (all?.userId) return String(all.userId);
  return null;
};
```

Legacy: if no assignments, treat `supportUserId` as `all`.

- [ ] **Step 3: Rewrite resolveSupportTarget order**

1. Load machine (if id): assignments / legacy → pick for `audienceForRole(role)` → else vendorId  
2. Load shop (machine.shopId or shopId): same → else ownerId  
3. Platform `findSupportAgent(audience)`  
4. Super Admin  

Keep `notSelf(callerId)`.

Select fields must include `supportAssignments`, `shopId` on machine.

- [ ] **Step 4: Tests**

Extend ability tests: custom role with `assigned-support` can update Shop when user id is in `supportAssignments`.  
Add a small unit test file for `pickFromAssignments` / resolver if extracted.

Run: `npx tsx --test app/lib/ability.test.ts app/lib/accessibleFilter.test.ts`  
Expected: all pass.

---

### Task 4: Shop/Machine repos normalize supportAssignments

**Files:**
- Modify: `moaddi-server/app/data/repos/shops.js`
- Modify: `moaddi-server/app/data/repos/machines.js`

**Interfaces:**
- Consumes: `normalizeSupportAssignments(rows, tenantId)`
- Tenant for shop = `ownerId`; for machine = `vendorId`

- [ ] **Step 1: On shop create/update**

If `"supportAssignments" in properties` (or shop body on create):

```js
properties.supportAssignments = await normalizeSupportAssignments(
  properties.supportAssignments,
  properties.ownerId ?? shop.ownerId ?? null,
);
// Optionally sync legacy:
const all = properties.supportAssignments.find((r) => r.audience === 'all');
properties.supportUserId = all?.userId ?? null;
```

If only legacy `supportUserId` is sent (old clients), convert:

```js
if (!("supportAssignments" in properties) && "supportUserId" in properties) {
  const id = await normalizeSupportUserId(...);
  properties.supportUserId = id;
  properties.supportAssignments = id ? [{ audience: 'all', userId: id }] : [];
}
```

- [ ] **Step 2: Same for machines** with `vendorId` as tenant.

- [ ] **Step 3: Manual smoke** — update a shop via API/admin with two audiences; confirm Mongo doc.

---

### Task 5: Admin SupportAssignmentsInput

**Files:**
- Create: `moaddi-next/app/(admin)/components/kit/inputs/SupportAssignmentsInput.jsx`
- Export from `AdminInputs.jsx` if that is the usual barrel

**Interfaces:**
- Consumes: `source` (default `supportAssignments`), `reference` staff resource (`staff`), `label`
- Produces: RHF array field `{ audience, userId }[]`

- [ ] **Step 1: Build editor UI**

Use `useInput({ source, defaultValue: [] })` + Array.isArray guard.  
For each row: SelectInput for audience (only unused options + current), ReferenceInput for staff.  
Add / remove buttons. Show helper: “Specific audience wins over All.”

Audience choices:

```js
const ROUTE_AUDIENCE_CHOICES = [
  { id: 'customers', name: 'Customers' },
  { id: 'vendors', name: 'Vendors' },
  { id: 'shopOwners', name: 'Shop owners' },
  { id: 'staff', name: 'Staff' },
  { id: 'all', name: 'All (fallback)' },
];
```

- [ ] **Step 2: Replace single pickers**

`ShopEdit.jsx`: remove `supportUserId` ReferenceInput; add `<SupportAssignmentsInput source="supportAssignments" />`.  
`MachineEdit.jsx`: same (keep `supplierIds` as-is).

- [ ] **Step 3: Manual QA** — Shop Owner edits shop, adds Customers + All rows, save, reload.

---

### Task 6: Supplier role template (Vendor)

**Files:**
- Create: `moaddi-next/app/(admin)/components/resources/roles/roleTemplates.js`
- Modify: `RoleCreate.jsx`, optionally `PermissionMatrix.jsx` to accept external default rows

**Interfaces:**
- Produces: `SUPPLIER_TEMPLATE_ROWS` / `applySupplierTemplate()` returning ruleRows for matrix

- [ ] **Step 1: Define template rows**

Mirror Fill machines page from `ruleChoices.js`:

```js
export const SUPPLIER_TEMPLATE = {
  id: 'supplier',
  label: 'Supplier (fill machines)',
  description: 'Update boxes on machines assigned to this staff member.',
  // Exact rows PermissionMatrix / matrixToRows expect — prefer setting
  // form `rules` via useFormContext after clicking Apply.
  hintPages: ['fillMachines'], // or explicit { action, subject, scope }[]
};
```

Prefer emitting concrete `ruleRows`:

```js
[
  { action: 'update', subject: 'Box', scope: 'assigned-machine' },
  // include alsoSubjects if Fill machines page lists them
]
```

Check `PERMISSION_GROUPS` Fill machines entry for `alsoSubjects`.

- [ ] **Step 2: RoleCreate UX**

If `usePermissions().role` lowercased is `vendor`, show button **Use template: Supplier (fill machines)** that `setValue('rules', templateRows)` (or whatever source PermissionMatrix uses — today it is likely `rules`).

Inspect PermissionMatrix `useInput({ source: 'rules' })` and set that source.

- [ ] **Step 3: Manual QA** — Vendor → Roles → Create → Apply template → save → role appears with fill permission.

---

### Task 7: Staff form machines when role has assigned-machine

**Files:**
- Modify: `moaddi-server/app/data/repos/users.js` `getById`
- Modify: `moaddi-next/.../makeUserResource.jsx`

**Interfaces:**
- Produces: user JSON includes `supplierMachineIds: string[]`

- [ ] **Step 1: getById attaches supplierMachineIds**

After loading user (or in a post-pipeline step):

```js
const Machines = require("../models/machines");
const assigned = await Machines.find({
  supplierIds: String(userId),
  isDeleted: { $ne: true },
}).select("_id").lean();
user.supplierMachineIds = assigned.map((m) => String(m._id));
```

(If getById returns aggregation result, `$lookup` machines where `supplierIds` contains user `_id` and `$addFields` ids — prefer simple follow-up query for clarity.)

- [ ] **Step 2: makeUserResource show picker**

Show Assigned machines when:

```js
const isVendor = String(permissions?.role || '').toLowerCase() === 'vendor';
const selectedRole = /* watch('role') */;
const roleHasAssignedMachine = /* from useGetList('roles') or getOne: rules some scope === 'assigned-machine' */;
const showSupplierMachines = isVendor && roleHasAssignedMachine;
```

Use `useWatch({ name: 'role' })` + roles list already fetched by `CustomRoleInput`.

- [ ] **Step 3: Manual QA** — Create Supplier staff, assign 2 machines, edit user, both still selected; filler login sees machines.

---

### Task 8: Wire machine Contact to support-target

**Files:**
- Modify: `moaddi-next/app/(root)/machine-products/page.jsx`
- Modify: any vending_app machine detail Contact that hard-codes vendor (search `vendorId` + Contact)

**Interfaces:**
- Consumes: `useSupportUserId('customers', { machineId })` or `useRegisterContactTarget` with resolved id

- [ ] **Step 1: Replace hard-coded vendor Contact**

Where Contact currently uses `machine?.vendorId`, switch to:

```js
const supportId = useSupportUserId('customers', { machineId: machine?._id });
// register contact target with supportId
```

Keep vendor as UI fallback only if supportId is null and product requires a button.

- [ ] **Step 2: Manual QA** — Set machine Customers assignee; open machine page as customer; Contact opens chat with that user.

---

### Task 9: Regression tests + checklist

**Files:**
- Modify/add tests under `moaddi-server/app/lib/`

- [ ] **Step 1: Run full ability + accessibleFilter + tenantAssignment tests**

```bash
cd moaddi-server
npx tsx --test app/lib/ability.test.ts app/lib/accessibleFilter.test.ts app/lib/tenantAssignment.test.js
```

Expected: all PASS.

- [ ] **Step 2: Manual QA checklist**

1. Vendor: Supplier template → staff + machines.  
2. Shop: Customers → A, Vendors → B, All → C; Contact as each role hits A/B/C.  
3. Machine override Customers → D; customer on that machine hits D.  
4. Migration: old `supportUserId` behaves as All.  
5. Shop Owner staff create still lists (shopId stamp from earlier fix).

---

## Spec coverage self-review

| Spec item | Task |
|-----------|------|
| Vendor Supplier template | 6 |
| Assign machines on staff create/edit + getById | 7 |
| `supportAssignments` model + unique + All | 1–2, 4–5 |
| Shop defaults + machine overrides | 3–5 |
| Resolver order | 3 |
| CASL assigned-support | 3 |
| Migrate supportUserId → all | 2 |
| Machine Contact uses machineId | 8 |
| No built-in Supplier revival | 6 (template only) |

## Placeholder scan

None intentional. Commit steps omitted unless user requests git commits.
