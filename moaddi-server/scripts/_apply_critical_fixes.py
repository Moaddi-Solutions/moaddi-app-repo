"""Apply critical logic fixes using verified on-disk strings."""
from pathlib import Path
import re

ROOT = Path(r"c:/COURSES/work/mostaql")
S = ROOT / "moaddi-server"
N = ROOT / "moaddi-next"
V = ROOT / "vending_app"


def once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"FAIL [{label}] old block not found")
    return text.replace(old, new, 1)


# =============================================================================
# 1) users controller — stop BASIC_ROLES bypass; stamp only custom roles
# =============================================================================
uc_path = S / "app/routes/controllers/users.js"
uc = uc_path.read_text(encoding="utf-8")

uc = once(
    uc,
    '''const BASIC_ROLES = ["vendor", "customer"];
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
''',
    '''const FORBIDDEN_TENANT_GRANTS = new Set([
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
''',
    "canGrantRole",
)

uc = once(
    uc,
    '''const stampTenantOnCreate = (req, body) => {
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
''',
    '''const stampTenantOnCreate = (req, body) => {
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
''',
    "stampTenantOnCreate",
)

uc_path.write_text(uc, encoding="utf-8")
print("OK users")

# =============================================================================
# 2) machines — tenant-clamp syncSupplierMachines + normalize on create
# =============================================================================
mp = S / "app/data/repos/machines.js"
m = mp.read_text(encoding="utf-8")

if 'require("../models/users")' not in m:
    m = m.replace(
        'const Machines = require("../models/machines");',
        'const Machines = require("../models/machines");\nconst Users = require("../models/users");',
        1,
    )

m = once(
    m,
    '''let syncSupplierMachines = async (supplierId, machineIds) => {
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
''',
    '''let syncSupplierMachines = async (supplierId, machineIds) => {
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
''',
    "syncSupplierMachines",
)

m = once(
    m,
    '''  machine._id = "machine_" + machine.mac;
  machine.created = moment().utc().add(config.timeDifference, "hours");
  machine.updated = moment().utc().add(config.timeDifference, "hours");
''',
    '''  if ("supportUserId" in machine || machine.supportUserId != null) {
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
  machine.updated = moment().utc().add(config.timeDifference, "hours");
''',
    "machine create normalize",
)

mp.write_text(m, encoding="utf-8")
print("OK machines")

# =============================================================================
# 3) shops create normalize
# =============================================================================
sp = S / "app/data/repos/shops.js"
s = sp.read_text(encoding="utf-8")
s = once(
    s,
    '''  shop.ownerId = ownerId;
  shop.created = moment().utc().add(config.timeDifference, "hours");
  shop.updated = moment().utc().add(config.timeDifference, "hours");
  shop = await shop.save();
''',
    '''  shop.ownerId = ownerId;
  if ("supportUserId" in shop || shop.supportUserId != null) {
    shop.supportUserId = await normalizeSupportUserId(
      shop.supportUserId,
      ownerId,
    );
  }
  shop.created = moment().utc().add(config.timeDifference, "hours");
  shop.updated = moment().utc().add(config.timeDifference, "hours");
  shop = await shop.save();
''',
    "shop create normalize",
)
sp.write_text(s, encoding="utf-8")
print("OK shops")

# =============================================================================
# 4) ability — permissionKey includes scope + tenant clamp
# =============================================================================
ap = S / "app/lib/ability.ts"
a = ap.read_text(encoding="utf-8")

a = once(
    a,
    '''export const permissionKey = (row: Pick<RuleRow, 'action' | 'subject'>): string =>
  `${row.action}:${row.subject}`;
''',
    '''export const permissionKey = (
  row: Pick<RuleRow, 'action' | 'subject' | 'scope'>,
): string => `${row.action}:${row.subject}:${row.scope}`;
''',
    "permissionKey",
)

if "validateTenantRuleRows" not in a:
    vm = re.search(
        r"export const validateRuleRows = \(rows: unknown\): string \| null => \{[\s\S]*?\n\};\n",
        a,
    )
    if not vm:
        raise SystemExit("validateRuleRows not found")
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
    a = a[: vm.end()] + clamp + a[vm.end() :]

ap.write_text(a, encoding="utf-8")
print("OK ability")

# =============================================================================
# 5) roles repo uses tenant clamp when ownerId set
# =============================================================================
rp = S / "app/data/repos/roles.js"
r = rp.read_text(encoding="utf-8")

r = once(
    r,
    '''const {
  rulesFor,
  rulesSignature,
  setCustomRoles,
  validateRuleRows,
} = require("../../lib/ability");
''',
    '''const {
  rulesFor,
  rulesSignature,
  setCustomRoles,
  validateRuleRows,
  validateTenantRuleRows,
} = require("../../lib/ability");
''',
    "roles require",
)

r = once(
    r,
    "  const rowsError = validateRuleRows(ruleRows || []);",
    "  const rowsError = ownerId\n    ? validateTenantRuleRows(ruleRows || [])\n    : validateRuleRows(ruleRows || []);",
    "roles create validate",
)

r = once(
    r,
    "    const rowsError = validateRuleRows(ruleRows);",
    "    const rowsError = role.ownerId\n      ? validateTenantRuleRows(ruleRows)\n      : validateRuleRows(ruleRows);",
    "roles update validate",
)

rp.write_text(r, encoding="utf-8")
print("OK roles")

# =============================================================================
# 6) ruleMatrix — keep own-* and assigned-* together
# =============================================================================
mx_path = N / "app/(admin)/components/resources/roles/ruleMatrix.js"
mx = mx_path.read_text(encoding="utf-8")
mx2 = mx.replace(
    "const key = `${action}:${subject}`;",
    "const key = `${action}:${subject}:${scope}`;",
)
mx2 = mx2.replace(
    "const key = `${row.action}:${row.subject}`;",
    "const key = `${row.action}:${row.subject}:${row.scope}`;",
)
if mx2 == mx:
    raise SystemExit("FAIL ruleMatrix keys not found")
mx_path.write_text(mx2, encoding="utf-8")
print("OK ruleMatrix")

# =============================================================================
# 7) vending shop — pass shopId into support resolver
# =============================================================================
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

# =============================================================================
# 8) machineRevenue — expose effectiveCommissionPercent
# =============================================================================
revp = S / "app/data/repos/machineRevenue.js"
rev = revp.read_text(encoding="utf-8")

if "effectiveCommissionPercent" not in rev.split("require")[0] and 'require("../../lib/shopScope")' not in rev:
    rev = once(
        rev,
        'const money = require("../../lib/money");',
        'const money = require("../../lib/money");\n'
        'const { effectiveCommissionPercent } = require("../../lib/shopScope");',
        "revenue import",
    )

rev = once(
    rev,
    "  const data = machines.map((m) => {",
    "  let data = machines.map((m) => {",
    "revenue let data",
)

rev = once(
    rev,
    "  return { data, total: data.length };",
    '''  data = await Promise.all(
    data.map(async (row) => ({
      ...row,
      effectiveCommissionPercent: await effectiveCommissionPercent(row.machineId),
    })),
  );

  return { data, total: data.length };''',
    "revenue enrich",
)

# ensure async
if not re.search(r"(?:const|let) getRevenueByMachine\s*=\s*async", rev):
    rev = re.sub(
        r"((?:const|let) getRevenueByMachine\s*=\s*)",
        r"\1async ",
        rev,
        count=1,
    )

revp.write_text(rev, encoding="utf-8")
print("OK machineRevenue")

# =============================================================================
# 9) panel labels + effective rate
# =============================================================================
panel = N / "app/(admin)/components/MachinesRevenuePanel.jsx"
pt = panel.read_text(encoding="utf-8")
pt = pt.replace("Sales and your cut per machine", "Sales and shop commission per machine")
pt = pt.replace("Your cut", "Shop cut")
pt = once(
    pt,
    '''                      {row.commissionPercent == null
                        ? "Shop default"
                        : `${Number(row.commissionPercent)}%`}''',
    '''                      {row.effectiveCommissionPercent != null
                        ? `${Number(row.effectiveCommissionPercent)}%`
                        : row.commissionPercent == null
                          ? "Shop default"
                          : `${Number(row.commissionPercent)}%`}''',
    "panel rate",
)
panel.write_text(pt, encoding="utf-8")
print("OK panel")

print("\n==== ALL CRITICAL FIXES APPLIED ====")
