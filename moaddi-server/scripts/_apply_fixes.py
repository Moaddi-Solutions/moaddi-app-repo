"""Apply critical logic fixes with exact on-disk strings."""
from pathlib import Path

ROOT = Path(r"c:/COURSES/work/mostaql")
S = ROOT / "moaddi-server"
N = ROOT / "moaddi-next"
V = ROOT / "vending_app"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"FAIL {label}: old block missing")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# 1) users controller
# ---------------------------------------------------------------------------
uc_path = S / "app/routes/controllers/users.js"
uc = uc_path.read_text(encoding="utf-8")

old_grant = '''const BASIC_ROLES = ["vendor", "customer"];
const FORBIDDEN_TENANT_GRANTS = new Set([
  String(ROLES.SUPER_ADMIN).toLowerCase(),
  String(ROLES.SHOP_OWNER).toLowerCase(),
  String(ROLES.VENDOR).toLowerCase(),
  String(ROLES.SUPPORT).toLowerCase(),
  "admin",
  "guest",
]);

const canGrantRole = async (req, role) => {
  if (role === undefined) return true;
  if (req.ability.can("manage", "all")) return true;
  const roleStr = String(role || "");
  if (BASIC_ROLES.includes(roleStr.toLowerCase())) return true;

  const caller = req.authenticatedUser || req.user;
  const builtIn = normalizeBuiltInRole(caller?.role);
  if (builtIn !== ROLES.VENDOR && builtIn !== ROLES.SHOP_OWNER) {
    return false;
  }
  if (FORBIDDEN_TENANT_GRANTS.has(roleStr.toLowerCase())) return false;
  // Namespaced tenant roles look like `${ownerId}__${slug}`.
  const owned = await rolesRepo.listOwnedRoleIds(String(caller._id));
  return owned.includes(roleStr);
};
'''

new_grant = '''const FORBIDDEN_TENANT_GRANTS = new Set([
  String(ROLES.SUPER_ADMIN).toLowerCase(),
  String(ROLES.SHOP_OWNER).toLowerCase(),
  String(ROLES.VENDOR).toLowerCase(),
  String(ROLES.CUSTOMER).toLowerCase(),
  String(ROLES.SUPPORT).toLowerCase(),
  "admin",
  "guest",
]);

/**
 * Who may grant which role:
 *  - Super Admin: anything
 *  - Vendor / ShopOwner: only custom roles they own (never built-ins)
 */
const canGrantRole = async (req, role) => {
  if (role === undefined) return true;
  if (req.ability.can("manage", "all")) return true;

  const caller = req.authenticatedUser || req.user;
  const builtIn = normalizeBuiltInRole(caller?.role);
  if (builtIn !== ROLES.VENDOR && builtIn !== ROLES.SHOP_OWNER) {
    return false;
  }
  const roleStr = String(role || "");
  if (FORBIDDEN_TENANT_GRANTS.has(roleStr.toLowerCase())) return false;
  // Namespaced tenant roles look like `${ownerId}__${slug}`.
  const owned = await rolesRepo.listOwnedRoleIds(String(caller._id));
  return owned.includes(roleStr);
};
'''

uc = replace_once(uc, old_grant, new_grant, "canGrantRole")

old_stamp = '''const stampTenantOnCreate = (req, body) => {
  const out = { ...(body || {}) };
  delete out.tenantId;
  delete out.tenantRole;
  const caller = req.authenticatedUser || req.user;
  if (!caller || req.ability.can("manage", "all")) return out;
  const builtIn = normalizeBuiltInRole(caller.role);
  if (builtIn === ROLES.VENDOR) {
    out.tenantId = String(caller._id);
    out.tenantRole = ROLES.VENDOR;
  } else if (builtIn === ROLES.SHOP_OWNER) {
    out.tenantId = String(caller._id);
    out.tenantRole = ROLES.SHOP_OWNER;
    if (!out.shopId && caller.shopId) out.shopId = caller.shopId;
    if (!Array.isArray(out.ownedShopIds) || out.ownedShopIds.length === 0) {
      const ids = shopScopeOf(caller);
      if (ids.length) out.ownedShopIds = ids;
    }
  }
  return out;
};
'''

new_stamp = '''const stampTenantOnCreate = (req, body) => {
  const out = { ...(body || {}) };
  delete out.tenantId;
  delete out.tenantRole;
  const caller = req.authenticatedUser || req.user;
  if (!caller || req.ability.can("manage", "all")) return out;
  const builtIn = normalizeBuiltInRole(caller.role);
  if (builtIn !== ROLES.VENDOR && builtIn !== ROLES.SHOP_OWNER) return out;

  // Only stamp tenant staff (custom roles). Never attach tenantId to built-ins.
  const granted = normalizeBuiltInRole(out.role);
  const isBuiltInGrant =
    granted === ROLES.SUPER_ADMIN ||
    granted === ROLES.SHOP_OWNER ||
    granted === ROLES.VENDOR ||
    granted === ROLES.CUSTOMER ||
    granted === ROLES.SUPPORT ||
    granted === "Guest" ||
    granted === "Admin";
  if (isBuiltInGrant) return out;

  if (builtIn === ROLES.VENDOR) {
    out.tenantId = String(caller._id);
    out.tenantRole = ROLES.VENDOR;
  } else if (builtIn === ROLES.SHOP_OWNER) {
    out.tenantId = String(caller._id);
    out.tenantRole = ROLES.SHOP_OWNER;
    if (!out.shopId && caller.shopId) out.shopId = caller.shopId;
    if (!Array.isArray(out.ownedShopIds) || out.ownedShopIds.length === 0) {
      const ids = shopScopeOf(caller);
      if (ids.length) out.ownedShopIds = ids;
    }
  }
  return out;
};
'''

uc = replace_once(uc, old_stamp, new_stamp, "stampTenantOnCreate")
uc_path.write_text(uc, encoding="utf-8")
print("OK users")

# ---------------------------------------------------------------------------
# 2) machines
# ---------------------------------------------------------------------------
mp = S / "app/data/repos/machines.js"
m = mp.read_text(encoding="utf-8")

if 'require("../models/users")' not in m:
    m = m.replace(
        'const Machines = require("../models/machines");',
        'const Machines = require("../models/machines");\nconst Users = require("../models/users");',
        1,
    )

old_sync = '''let syncSupplierMachines = async (supplierId, machineIds) => {
  const uid = String(supplierId);
  const desired = [
    ...new Set(
      (Array.isArray(machineIds) ? machineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];
  const desiredSet = new Set(desired);

  const currentlyAssigned = await Machines.find({
    supplierIds: uid,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();
  const currentIds = currentlyAssigned.map((m) => String(m._id));
  const currentSet = new Set(currentIds);

  for (const id of desired) {
    if (currentSet.has(id)) continue;
    await Machines.updateOne(
      { _id: id, isDeleted: { $ne: true } },
      { $addToSet: { supplierIds: uid } },
    );
    await boxesRepo.remachine(id);
  }
  for (const id of currentIds) {
    if (desiredSet.has(id)) continue;
    await Machines.updateOne(
      { _id: id },
      { $pull: { supplierIds: uid } },
    );
    await boxesRepo.remachine(id);
  }
  return desired;
};
'''

new_sync = '''let syncSupplierMachines = async (supplierId, machineIds) => {
  const uid = String(supplierId);
  const desired = [
    ...new Set(
      (Array.isArray(machineIds) ? machineIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ];
  const desiredSet = new Set(desired);

  // Resolve the supplier's vendor tenant. Never attach them to another
  // vendor's machines (normalizeSupplierIds is bypassed on this path).
  const supplier = await Users.findOne({ _id: uid }).select("tenantId role").lean();
  const tenantVendorId =
    (supplier && supplier.tenantId && String(supplier.tenantId)) || null;
  if (!tenantVendorId) {
    return Promise.reject({
      message: "Cannot assign supplier machines without a vendor tenant.",
      statusCode: 400,
    });
  }

  const currentlyAssigned = await Machines.find({
    supplierIds: uid,
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();
  const currentIds = currentlyAssigned.map((row) => String(row._id));
  const currentSet = new Set(currentIds);

  for (const id of desired) {
    if (currentSet.has(id)) continue;
    const result = await Machines.updateOne(
      {
        _id: id,
        isDeleted: { $ne: true },
        vendorId: tenantVendorId,
      },
      { $addToSet: { supplierIds: uid } },
    );
    if (result.matchedCount === 0) {
      return Promise.reject({
        message: `Machine ${id} is not in this supplier's vendor tenant.`,
        statusCode: 400,
      });
    }
    await boxesRepo.remachine(id);
  }
  for (const id of currentIds) {
    if (desiredSet.has(id)) continue;
    await Machines.updateOne(
      { _id: id },
      { $pull: { supplierIds: uid } },
    );
    await boxesRepo.remachine(id);
  }
  return desired;
};
'''

m = replace_once(m, old_sync, new_sync, "syncSupplierMachines")

old_create_id = '''  machine._id = "machine_" + machine.mac;
  machine.created = moment().utc().add(config.timeDifference, "hours");
'''

new_create_id = '''  if ("supportUserId" in machine || machine.supportUserId != null) {
    machine.supportUserId = await normalizeSupportUserId(
      machine.supportUserId,
      machine.vendorId ?? null,
    );
  }
  if ("supplierIds" in machine || machine.supplierIds != null) {
    machine.supplierIds = await normalizeSupplierIds(
      machine.supplierIds,
      machine.vendorId ?? null,
    );
  }

  machine._id = "machine_" + machine.mac;
  machine.created = moment().utc().add(config.timeDifference, "hours");
'''

if "normalizeSupportUserId(\n      machine.supportUserId" not in m:
    m = replace_once(m, old_create_id, new_create_id, "machine create normalize")

mp.write_text(m, encoding="utf-8")
print("OK machines")

# ---------------------------------------------------------------------------
# 3) shops create
# ---------------------------------------------------------------------------
sp = S / "app/data/repos/shops.js"
s = sp.read_text(encoding="utf-8")

old_shop = '''  shop.ownerId = ownerId;
  shop.created = moment().utc().add(config.timeDifference, "hours");
'''

new_shop = '''  shop.ownerId = ownerId;
  if ("supportUserId" in shop || shop.supportUserId != null) {
    shop.supportUserId = await normalizeSupportUserId(
      shop.supportUserId,
      ownerId,
    );
  }
  shop.created = moment().utc().add(config.timeDifference, "hours");
'''

# Only inject into create — first occurrence after normalizeOwnerId is create
if "normalizeSupportUserId(\n      shop.supportUserId,\n      ownerId" not in s:
    # replace first occurrence only (create)
    s = replace_once(s, old_shop, new_shop, "shop create normalize")
    sp.write_text(s, encoding="utf-8")
    print("OK shops")
else:
    print("shops already ok")

# ---------------------------------------------------------------------------
# 4) ability.ts
# ---------------------------------------------------------------------------
ap = S / "app/lib/ability.ts"
a = ap.read_text(encoding="utf-8")

old_pk = '''export const permissionKey = (row: Pick<RuleRow, 'action' | 'subject'>): string =>
  `${row.action}:${row.subject}`;
'''

new_pk = '''export const permissionKey = (
  row: Pick<RuleRow, 'action' | 'subject' | 'scope'>,
): string => `${row.action}:${row.subject}:${row.scope}`;
'''

a = replace_once(a, old_pk, new_pk, "permissionKey")

# Update duplicate error message if it mentions action/subject only
a = a.replace(
    "`Duplicate permission: ${r.action} on ${r.subject}.`",
    "`Duplicate permission: ${r.action} on ${r.subject} (${r.scope}).`",
)

if "validateTenantRuleRows" not in a:
    clamp = '''
/** Subjects a tenant-owned role must never grant. */
export const PLATFORM_SUBJECTS: ReadonlySet<SubjectName> = new Set([
  'Option',
  'Content',
  'PaymentProvider',
  'Role',
]);

/** Scopes a tenant-owned role may use. */
export const TENANT_RULE_SCOPES: readonly RuleScope[] = [
  'own-shop',
  'own-vendor',
  'self',
  'assigned-machine',
  'assigned-support',
];

/**
 * Extra checks when a Vendor / ShopOwner owns the role. UI hides platform
 * subjects; this is the server-side clamp so the API cannot mint them.
 */
export const validateTenantRuleRows = (rows: unknown): string | null => {
  const base = validateRuleRows(rows);
  if (base) return base;
  for (const row of rows as RuleRow[]) {
    if (PLATFORM_SUBJECTS.has(row.subject)) {
      return `Tenant roles cannot grant subject "${row.subject}".`;
    }
    if (!(TENANT_RULE_SCOPES as readonly string[]).includes(row.scope)) {
      return `Tenant roles cannot use scope "${row.scope}".`;
    }
  }
  return null;
};

'''
    marker = "export const validateRuleRows"
    # Insert after the full validateRuleRows function
    import re

    vm = re.search(
        r"export const validateRuleRows = \(rows: unknown\): string \| null => \{[\s\S]*?\n\};\n",
        a,
    )
    if not vm:
        raise SystemExit("validateRuleRows fn not found")
    a = a[: vm.end()] + clamp + a[vm.end() :]

ap.write_text(a, encoding="utf-8")
print("OK ability")

# ---------------------------------------------------------------------------
# 5) roles repo
# ---------------------------------------------------------------------------
rp = S / "app/data/repos/roles.js"
r = rp.read_text(encoding="utf-8")

old_req = '''const {
  rulesFor,
  rulesSignature,
  setCustomRoles,
  validateRuleRows,
} = require("../../lib/ability");
'''

new_req = '''const {
  rulesFor,
  rulesSignature,
  setCustomRoles,
  validateRuleRows,
  validateTenantRuleRows,
} = require("../../lib/ability");
'''

if "validateTenantRuleRows" not in r:
    r = replace_once(r, old_req, new_req, "roles require")
    r = replace_once(
        r,
        "  const rowsError = validateRuleRows(ruleRows || []);",
        "  const rowsError = ownerId\n    ? validateTenantRuleRows(ruleRows || [])\n    : validateRuleRows(ruleRows || []);",
        "roles create validate",
    )
    r = replace_once(
        r,
        "    const rowsError = validateRuleRows(ruleRows);",
        "    const rowsError = role.ownerId\n      ? validateTenantRuleRows(ruleRows)\n      : validateRuleRows(ruleRows);",
        "roles update validate",
    )
    rp.write_text(r, encoding="utf-8")
    print("OK roles")
else:
    print("roles already ok")

# ---------------------------------------------------------------------------
# 6) ruleMatrix — allow own-* and assigned-* to coexist
# ---------------------------------------------------------------------------
mx_path = N / "app/(admin)/components/resources/roles/ruleMatrix.js"
mx = mx_path.read_text(encoding="utf-8")

# Read surrounding lines for exact whitespace
lines = mx.splitlines(keepends=True)
changed = 0
for i, line in enumerate(lines):
    if 'const key = `${action}:${subject}`;' in line:
        lines[i] = line.replace(
            "`${action}:${subject}`",
            "`${action}:${subject}:${scope}`",
        )
        changed += 1
    if 'const key = `${row.action}:${row.subject}`;' in line:
        lines[i] = line.replace(
            "`${row.action}:${row.subject}`",
            "`${row.action}:${row.subject}:${row.scope}`",
        )
        changed += 1
    if 'keys.add(`${action}:${subject}`)' in line:
        # generatable set can stay action:subject OR include scope —
        # leave generatable as-is (it's "can this page produce this permission")
        pass

if changed:
    mx_path.write_text("".join(lines), encoding="utf-8")
    print(f"OK ruleMatrix ({changed})")
else:
    print("WARN ruleMatrix unchanged")

# ---------------------------------------------------------------------------
# 7) vending shop shopId
# ---------------------------------------------------------------------------
shop = V / "app/Shop/[shopId].jsx"
st = shop.read_text(encoding="utf-8")
st2 = st.replace(
    "const supportTargetId = useSupportUserId();",
    "const supportTargetId = useSupportUserId({ shopId });",
    1,
)
if st2 == st:
    raise SystemExit("FAIL shop support line not found")
shop.write_text(st2, encoding="utf-8")
print("OK vending shop")

# ---------------------------------------------------------------------------
# 8) machineRevenue effective rate
# ---------------------------------------------------------------------------
revp = S / "app/data/repos/machineRevenue.js"
rev = revp.read_text(encoding="utf-8")

if "effectiveCommissionPercent" not in rev:
    if 'require("../../lib/shopScope")' not in rev:
        rev = rev.replace(
            'const money = require("../../lib/money");',
            'const money = require("../../lib/money");\n'
            'const { effectiveCommissionPercent } = require("../../lib/shopScope");',
            1,
        )

    old_map = '''    const commissionPercent =
      m.commissionPercent != null ? money.toNumber(m.commissionPercent) : null;
    return {
      machineId: id,
      name: m.name,
      shopId: m.shopId ?? null,
      vendorId: m.vendorId ?? null,
      commissionPercent,
'''

    # Make getRevenueByMachine build data with awaits — convert the map to a loop.
    # Safer: after `const data = machines.map(...)` enrich in a second pass.
    if "const data = machines.map" in rev:
        rev = rev.replace(
            "const data = machines.map",
            "let data = machines.map",
            1,
        )
        old_return = "  return { data, total: data.length };"
        new_return = '''  data = await Promise.all(
    data.map(async (row) => ({
      ...row,
      effectiveCommissionPercent: await effectiveCommissionPercent(row.machineId),
    })),
  );

  return { data, total: data.length };'''
        rev = replace_once(rev, old_return, new_return, "revenue enrich")
        # ensure function is async
        if "const getRevenueByMachine = async" not in rev:
            rev = rev.replace(
                "const getRevenueByMachine = (",
                "const getRevenueByMachine = async (",
                1,
            )
            # also try: async function / let getRevenueByMachine = async
            if "getRevenueByMachine = async" not in rev:
                rev = rev.replace(
                    "let getRevenueByMachine = async",
                    "let getRevenueByMachine = async",
                    1,
                )
                # find declaration
                import re

                if not re.search(r"(?:const|let|async function) getRevenueByMachine\s*=\s*async", rev):
                    rev = re.sub(
                        r"((?:const|let) getRevenueByMachine\s*=\s*)",
                        r"\1async ",
                        rev,
                        count=1,
                    )
        revp.write_text(rev, encoding="utf-8")
        print("OK machineRevenue")
    else:
        print("WARN could not find machines.map in revenue")
        revp.write_text(rev, encoding="utf-8")
else:
    print("machineRevenue already ok")

# ---------------------------------------------------------------------------
# 9) panel
# ---------------------------------------------------------------------------
panel = N / "app/(admin)/components/MachinesRevenuePanel.jsx"
pt = panel.read_text(encoding="utf-8")
pt2 = pt
pt2 = pt2.replace("Your cut", "Shop cut")
pt2 = pt2.replace(
    "Sales and your cut per machine",
    "Sales and shop commission per machine",
)

import re

mrate = re.search(
    r"\{row\.commissionPercent\s*==\s*null\s*\?[\s\S]*?Number\(row\.commissionPercent\)[\s\S]*?\}",
    pt2,
)
if mrate:
    pt2 = (
        pt2[: mrate.start()]
        + '{row.effectiveCommissionPercent != null\n'
        "                        ? `${Number(row.effectiveCommissionPercent)}%`\n"
        "                        : row.commissionPercent == null\n"
        '                          ? "Shop default"\n'
        "                          : `${Number(row.commissionPercent)}%`}"
        + pt2[mrate.end() :]
    )
    print("OK panel rate")
else:
    print("WARN panel rate pattern missing")
    for l in pt2.splitlines():
        if "commission" in l.lower() or "default" in l.lower() or "cut" in l.lower():
            print(" ", l)

if pt2 != pt:
    panel.write_text(pt2, encoding="utf-8")
    print("OK panel saved")

print("\n==== ALL FIXES APPLIED ====")
