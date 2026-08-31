"""Apply critical logic fixes. Discovers exact on-disk text first."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"c:/COURSES/work/mostaql")
SERVER = ROOT / "moaddi-server"
NEXT = ROOT / "moaddi-next"
VEND = ROOT / "vending_app"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"FAIL [{label}]: old block not found")
    return text.replace(old, new, 1)


# =============================================================================
# 1) users controller
# =============================================================================
uc_path = SERVER / "app/routes/controllers/users.js"
uc = uc_path.read_text(encoding="utf-8")

m = re.search(
    r"const BASIC_ROLES[\s\S]*?const canGrantRole = async \(req, role\) => \{[\s\S]*?\n\};\n",
    uc,
)
if not m:
    raise SystemExit("canGrantRole block not found")
old_grant = m.group(0)
print("--- OLD canGrantRole ---")
print(old_grant)

list_owned = re.search(r"await (\w+\.\w+)\(", old_grant).group(1)
norm = (
    "normalizeBuiltInRole"
    if "normalizeBuiltInRole" in old_grant
    else "normalizeBuiltInRole"
)
if "normalizeBuiltInRole" in old_grant:
    norm = "normalizeBuiltInRole"
caller = (
    "req.authenticatedUser || req.user"
    if "authenticatedUser" in old_grant
    else "req.authenticatedUser || req.user"
)
if "authenticatedUser" in old_grant:
    caller = "req.authenticatedUser || req.user"
manage = (
    'req.ability.can("manage", "all")'
    if 'req.ability.can("manage", "all")' in old_grant
    else 'req.ability.can("manage", "all")'
)
if 'req.ability.can("manage", "all")' in old_grant:
    manage = 'req.ability.can("manage", "all")'

new_grant = f"""const FORBIDDEN_TENANT_GRANTS = new Set([
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
const canGrantRole = async (req, role) => {{
  if (role === undefined) return true;
  if ({manage}) return true;

  const caller = {caller};
  const builtIn = {norm}(caller?.role);
  if (builtIn !== ROLES.VENDOR && builtIn !== ROLES.SHOP_OWNER) {{
    return false;
  }}
  const roleStr = String(role || "");
  if (FORBIDDEN_TENANT_GRANTS.has(roleStr.toLowerCase())) return false;
  const owned = await {list_owned}(String(caller._id));
  return owned.includes(roleStr);
}};
"""

uc = replace_once(uc, old_grant, new_grant, "canGrantRole")

m2 = re.search(
    r"const stampTenantOnCreate = \(req, body\) => \{[\s\S]*?\n\};\n",
    uc,
)
if not m2:
    raise SystemExit("stampTenantOnCreate not found")
old_stamp = m2.group(0)
print("--- OLD stampTenantOnCreate ---")
print(old_stamp)

shop_scope = "shopScopeOf" if "shopScopeOf" in old_stamp else "shopScopeOf"
if "shopScopeOf" in old_stamp:
    shop_scope = "shopScopeOf"
owned_field = "ownedShopIds" if "ownedShopIds" in old_stamp else "ownedShopIds"
shop_field = "shopId" if "shopId" in old_stamp else "shopId"
tenant_role_field = "tenantRole" if "tenantRole" in old_stamp else "tenantRole"

new_stamp = f"""const stampTenantOnCreate = (req, body) => {{
  const out = {{ ...(body || {{}}) }};
  delete out.tenantId;
  delete out.{tenant_role_field};
  const caller = {caller};
  if (!caller || {manage}) return out;
  const builtIn = {norm}(caller.role);
  if (builtIn !== ROLES.VENDOR && builtIn !== ROLES.SHOP_OWNER) return out;

  // Only stamp tenant staff (custom roles). Never attach tenantId to built-ins.
  const granted = {norm}(out.role);
  const isBuiltInGrant =
    granted === ROLES.SUPER_ADMIN ||
    granted === ROLES.SHOP_OWNER ||
    granted === ROLES.VENDOR ||
    granted === ROLES.CUSTOMER ||
    granted === ROLES.SUPPORT ||
    granted === "Guest" ||
    granted === "Admin";
  if (isBuiltInGrant) return out;

  if (builtIn === ROLES.VENDOR) {{
    out.tenantId = String(caller._id);
    out.{tenant_role_field} = ROLES.VENDOR;
  }} else if (builtIn === ROLES.SHOP_OWNER) {{
    out.tenantId = String(caller._id);
    out.{tenant_role_field} = ROLES.SHOP_OWNER;
    if (!out.{shop_field} && caller.{shop_field}) out.{shop_field} = caller.{shop_field};
    if (!Array.isArray(out.{owned_field}) || out.{owned_field}.length === 0) {{
      const ids = {shop_scope}(caller);
      if (ids.length) out.{owned_field} = ids;
    }}
  }}
  return out;
}};
"""

uc = replace_once(uc, old_stamp, new_stamp, "stampTenantOnCreate")
uc_path.write_text(uc, encoding="utf-8")
print("OK users controller")

# =============================================================================
# 2) machines sync + create
# =============================================================================
mp = SERVER / "app/data/repos/machines.js"
mtext = mp.read_text(encoding="utf-8")

sm = re.search(r"(?:let|const) syncSupplierMachines = async[\s\S]*?\n\};\n", mtext)
if not sm:
    raise SystemExit("syncSupplierMachines not found")
old_sync = sm.group(0)
print("--- OLD syncSupplierMachines ---")
print(old_sync[:600])

bm = re.search(r"await (\w+\.\w+)\(\w+\)", old_sync)
boxes_call = bm.group(1) if bm else "boxesRepo.remachine"
supplier_field = "supplierIds" if "supplierIds" in old_sync else "supplierIds"
deleted_field = "isDeleted" if "isDeleted" in old_sync else "isDeleted"
vendor_field = "vendorId" if re.search(r"\bvendorId\b", mtext) else "vendorId"

im = re.search(
    r"\{\s*([^}]+)\}\s*=\s*require\(\"\.\./\.\./lib/tenantAssignment\"\)",
    mtext,
)
norm_support = "normalizeSupportUserId"
norm_supplier = "normalizeSupplierIds"
if im:
    for n in [x.strip() for x in im.group(1).split(",")]:
        if "upport" in n:
            norm_support = n
        if "upplier" in n and "Ids" in n:
            norm_supplier = n

if 'require("../models/users")' not in mtext:
    mtext = mtext.replace(
        'const Machines = require("../models/machines");',
        'const Machines = require("../models/machines");\nconst Users = require("../models/users");',
        1,
    )

new_sync = f"""let syncSupplierMachines = async (supplierId, machineIds) => {{
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
  // vendor's machines ({norm_supplier} is bypassed on this path).
  const supplier = await Users.findOne({{ _id: uid }}).select("tenantId role").lean();
  const tenantVendorId =
    (supplier && supplier.tenantId && String(supplier.tenantId)) || null;
  if (!tenantVendorId) {{
    return Promise.reject({{
      message: "Cannot assign supplier machines without a vendor tenant.",
      statusCode: 400,
    }});
  }}

  const currentlyAssigned = await Machines.find({{
    {supplier_field}: uid,
    {deleted_field}: {{ $ne: true }},
  }})
    .select("_id")
    .lean();
  const currentIds = currentlyAssigned.map((row) => String(row._id));
  const currentSet = new Set(currentIds);

  for (const id of desired) {{
    if (currentSet.has(id)) continue;
    const result = await Machines.updateOne(
      {{
        _id: id,
        {deleted_field}: {{ $ne: true }},
        {vendor_field}: tenantVendorId,
      }},
      {{ $addToSet: {{ {supplier_field}: uid }} }},
    );
    if (result.matchedCount === 0) {{
      return Promise.reject({{
        message: `Machine ${{id}} is not in this supplier's vendor tenant.`,
        statusCode: 400,
      }});
    }}
    await {boxes_call}(id);
  }}
  for (const id of currentIds) {{
    if (desiredSet.has(id)) continue;
    await Machines.updateOne(
      {{ _id: id }},
      {{ $pull: {{ {supplier_field}: uid }} }},
    );
    await {boxes_call}(id);
  }}
  return desired;
}};
"""

mtext = replace_once(mtext, old_sync, new_sync, "syncSupplierMachines")

# create normalize
if f"await {norm_support}(" not in mtext.split("let create")[1][:2500]:
    cm = re.search(
        r'(let create = async \(machine\) => \{[\s\S]*?)(machine\._id\s*=\s*"machine_" \+ machine\.mac;)',
        mtext,
    )
    if not cm:
        raise SystemExit("machine create id assign not found")
    inject = (
        cm.group(1)
        + f"""  if ("supportUserId" in machine || machine.supportUserId != null) {{
    machine.supportUserId = await {norm_support}(
      machine.supportUserId,
      machine.{vendor_field} ?? null,
    );
  }}
  if ("{supplier_field}" in machine || machine.{supplier_field} != null) {{
    machine.{supplier_field} = await {norm_supplier}(
      machine.{supplier_field},
      machine.{vendor_field} ?? null,
    );
  }}

  """
        + cm.group(2)
    )
    mtext = mtext[: cm.start()] + inject + mtext[cm.end() :]
    print("OK machine create normalize")
else:
    print("machine create already normalizes")

mp.write_text(mtext, encoding="utf-8")
print("OK machines")

# =============================================================================
# 3) shops create
# =============================================================================
sp = SERVER / "app/data/repos/shops.js"
stext = sp.read_text(encoding="utf-8")
ci = stext.find("let create = async")
region = stext[ci : ci + 2500]
print("--- shop create head ---")
print(region[:500])

shop_norm = "normalizeSupportUserId"
sim = re.search(
    r"\{\s*([^}]+)\}\s*=\s*require\(\"\.\./\.\./lib/tenantAssignment\"\)",
    stext,
)
if sim:
    for n in [x.strip() for x in sim.group(1).split(",")]:
        if "upport" in n:
            shop_norm = n

if shop_norm not in region:
    mo = re.search(r"(shop\.ownerId\s*=\s*ownerId;\s*\n)", region)
    if not mo:
        raise SystemExit("shop.ownerId assign not found")
    abs_start = ci + mo.start()
    abs_end = ci + mo.end()
    insert = mo.group(1) + (
        f'  if ("supportUserId" in shop || shop.supportUserId != null) {{\n'
        f"    shop.supportUserId = await {shop_norm}(\n"
        f"      shop.supportUserId,\n"
        f"      ownerId,\n"
        f"    );\n"
        f"  }}\n"
    )
    stext = stext[:abs_start] + insert + stext[abs_end:]
    sp.write_text(stext, encoding="utf-8")
    print("OK shops create")
else:
    print("shops create already normalizes")

# =============================================================================
# 4) ability.ts
# =============================================================================
ap = SERVER / "app/lib/ability.ts"
a = ap.read_text(encoding="utf-8")

pk = re.search(r"export const permissionKey = [\s\S]*?;\n", a)
if not pk:
    raise SystemExit("permissionKey not found")
print("--- permissionKey ---")
print(pk.group(0))

row_type = "RuleRow" if "RuleRow" in a[:5000] else "RuleRow"
for cand in ("RuleRow", "RuleRow", "AbilityRule"):
    if f"export type {cand}" in a or f"export interface {cand}" in a or f"type {cand} =" in a:
        row_type = cand
        break

new_pk = f"""export const permissionKey = (
  row: Pick<{row_type}, 'action' | 'subject' | 'scope'>,
): string => `${{row.action}}:${{row.subject}}:${{row.scope}}`;
"""
a = replace_once(a, pk.group(0), new_pk, "permissionKey")

vr_name = "validateRuleRows"
for cand in ("validateRuleRows", "validateRuleRows"):
    if f"export const {cand}" in a:
        vr_name = cand
        break

subj_type = "SubjectName" if "SubjectName" in a else "SubjectName"
for cand in ("SubjectName", "SubjectName", "AbilitySubject"):
    if f"type {cand}" in a or f"export type {cand}" in a:
        subj_type = cand
        break

scope_type = "RuleScope"
for cand in ("RuleScope", "RuleScope"):
    if f"type {cand}" in a or f"export type {cand}" in a:
        scope_type = cand
        break

# Detect actual tenant scopes from RULE_SCOPES
scopes_block = re.search(r"RULE_SCOPES[^=]*=\s*\[([^\]]+)\]", a)
scope_vals = []
if scopes_block:
    scope_vals = re.findall(r"'([^']+)'", scopes_block.group(1))
tenant_scopes = [
    s
    for s in scope_vals
    if s in ("own-shop", "own-vendor", "self", "assigned-machine", "assigned-support")
]
if not tenant_scopes:
    tenant_scopes = [
        "own-shop",
        "own-vendor",
        "self",
        "assigned-machine",
        "assigned-support",
    ]

# Detect platform subjects that exist in ASSIGNABLE
platform_candidates = ["Option", "Content", "PaymentProvider", "Role"]
assignable = re.search(r"ASSIGNABLE_SUBJECTS[^=]*=\s*\[([^\]]+)\]", a)
present = set(re.findall(r"'([^']+)'", assignable.group(1))) if assignable else set()
platform = [p for p in platform_candidates if p in present] or platform_candidates

if "validateTenantRuleRows" not in a:
    clamp = f"""
/** Subjects a tenant-owned role must never grant. */
export const PLATFORM_SUBJECTS: ReadonlySet<{subj_type}> = new Set([
  {", ".join(repr(p) for p in platform)},
]);

/** Scopes a tenant-owned role may use. */
export const TENANT_RULE_SCOPES: readonly {scope_type}[] = [
  {", ".join(repr(s) for s in tenant_scopes)},
];

/**
 * Extra checks when a Vendor / ShopOwner owns the role. UI hides platform
 * subjects; this is the server-side clamp so the API cannot mint them.
 */
export const validateTenantRuleRows = (rows: unknown): string | null => {{
  const base = {vr_name}(rows);
  if (base) return base;
  for (const row of rows as {row_type}[]) {{
    if (PLATFORM_SUBJECTS.has(row.subject as {subj_type})) {{
      return `Tenant roles cannot grant subject "${{row.subject}}".`;
    }}
    if (!(TENANT_RULE_SCOPES as readonly string[]).includes(row.scope)) {{
      return `Tenant roles cannot use scope "${{row.scope}}".`;
    }}
  }}
  return null;
}};

"""
    vm = re.search(
        rf"export const {vr_name} = \(rows: unknown\): string \| null => \{{[\s\S]*?\n\}};\n",
        a,
    )
    if not vm:
        raise SystemExit("validateRuleRows fn not found")
    a = a[: vm.end()] + clamp + a[vm.end() :]

ap.write_text(a, encoding="utf-8")
print("OK ability")

# =============================================================================
# 5) roles repo
# =============================================================================
rp = SERVER / "app/data/repos/roles.js"
r = rp.read_text(encoding="utf-8")
print("--- roles ability import ---")
print(re.search(r"require\(\"../../lib/ability\"\)[\s\S]{0,120}|const \{[^}]+\} = require\(\"../../lib/ability\"\);", r).group(0))

if "validateTenantRuleRows" not in r:
    req = re.search(r"const \{([^}]+)\} = require\(\"../../lib/ability\"\);", r)
    if not req:
        raise SystemExit("roles ability require not found")
    names = req.group(1).strip().rstrip(",")
    r = r.replace(
        req.group(0),
        f'const {{{names}, validateTenantRuleRows}} = require("../../lib/ability");',
        1,
    )

    # create
    if "const rowsError = validateRuleRows(ruleRows || []);" in r:
        r = r.replace(
            "const rowsError = validateRuleRows(ruleRows || []);",
            "const rowsError = ownerId\n    ? validateTenantRuleRows(ruleRows || [])\n    : validateRuleRows(ruleRows || []);",
            1,
        )
    # update — second occurrence of validateRuleRows(ruleRows)
    # replace carefully inside update only
    parts = r.split("let update = async")
    if len(parts) == 2:
        head, rest = parts
        rest = rest.replace(
            "const rowsError = validateRuleRows(ruleRows);",
            "const rowsError = role.ownerId\n      ? validateTenantRuleRows(ruleRows)\n      : validateRuleRows(ruleRows);",
            1,
        )
        r = head + "let update = async" + rest
    rp.write_text(r, encoding="utf-8")
    print("OK roles repo")
else:
    print("roles already clamped")

# =============================================================================
# 6) ruleMatrix
# =============================================================================
mx_path = NEXT / "app/(admin)/components/resources/roles/ruleMatrix.js"
mx = mx_path.read_text(encoding="utf-8")
print("--- matrix key lines ---")
for line in mx.splitlines():
    if "action}" in line and "subject" in line:
        print(line)

replaced = 0
patterns = [
    (
        "const key = `${action}:${subject}`;\n        if (seen.has(key)) continue;\n        seen.add(key);\n        rows.push({ action, subject, scope });",
        "const key = `${action}:${subject}:${scope}`;\n        if (seen.has(key)) continue;\n        seen.add(key);\n        rows.push({ action, subject, scope });",
    ),
    (
        "const key = `${row.action}:${row.subject}`;\n    if (seen.has(key)) continue;\n    seen.add(key);\n    rows.push(row);",
        "const key = `${row.action}:${row.subject}:${row.scope}`;\n    if (seen.has(key)) continue;\n    seen.add(key);\n    rows.push(row);",
    ),
]
for old, new in patterns:
    if old in mx:
        mx = mx.replace(old, new)
        replaced += 1
if replaced:
    mx_path.write_text(mx, encoding="utf-8")
    print(f"OK ruleMatrix x{replaced}")
else:
    print("WARN ruleMatrix not patched")

# =============================================================================
# 7) vending shop
# =============================================================================
shop = VEND / "app/Shop/[shopId].jsx"
st = shop.read_text(encoding="utf-8")
if "useSupportUserId({ shopId" in st or "useSupportUserId({shopId" in st:
    print("shop already passes shopId")
elif "useSupportUserId()" in st:
    st = st.replace("useSupportUserId()", "useSupportUserId({ shopId })", 1)
    shop.write_text(st, encoding="utf-8")
    print("OK vending shopId")
else:
    print("WARN shop hook not found")
    print([l for l in st.splitlines() if "upport" in l])

# =============================================================================
# 8) machineRevenue effective rate
# =============================================================================
revp = SERVER / "app/data/repos/machineRevenue.js"
rev = revp.read_text(encoding="utf-8")
print("--- revenue commission region ---")
i = rev.find("commissionPercent")
print(rev[max(0, i - 250) : i + 450])

# Detect shopScope export name
ss = (SERVER / "app/lib/shopScope.ts").read_text(encoding="utf-8")
eff_name = "effectiveCommissionPercent"
if "export const effectiveCommissionPercent" in ss:
    eff_name = "effectiveCommissionPercent"
elif "export const effectiveCommissionPercent" in ss:
    eff_name = "effectiveCommissionPercent"

if eff_name not in rev:
    if "shopScope" not in rev:
        if 'require("../../lib/money")' in rev:
            rev = rev.replace(
                'const money = require("../../lib/money");',
                'const money = require("../../lib/money");\n'
                f'const {{ {eff_name} }} = require("../../lib/shopScope");',
                1,
            )
    # Enrich before return
    ret = re.search(r"\n  return \{ data(?:, total)?", rev)
    if ret and f"await {eff_name}" not in rev:
        enrich = f"""
  for (const row of data) {{
    row.effectiveCommissionPercent = await {eff_name}(row.machineId);
  }}
"""
        rev = rev[: ret.start()] + enrich + rev[ret.start() :]
        # ensure async
        rev = re.sub(
            r"const getRevenueByMachine = \(",
            "const getRevenueByMachine = async (",
            rev,
            count=1,
        )
        revp.write_text(rev, encoding="utf-8")
        print("OK machineRevenue")
    else:
        revp.write_text(rev, encoding="utf-8")
        print("WARN revenue enrich skipped")
else:
    print("machineRevenue already effective")

# =============================================================================
# 9) panel labels + effective display
# =============================================================================
panel = NEXT / "app/(admin)/components/MachinesRevenuePanel.jsx"
pt = panel.read_text(encoding="utf-8")
print("--- panel commission lines ---")
for line in pt.splitlines():
    if "commission" in line.lower() or "cut" in line.lower() or "default" in line.lower():
        print(line)

pt2 = pt
pt2 = pt2.replace("Your cut", "Shop cut")
pt2 = pt2.replace("Sales and your cut per machine", "Sales and shop commission per machine")
pt2 = pt2.replace("Sales & your cut per machine", "Sales and shop commission per machine")

if "effectiveCommissionPercent" not in pt2:
    # Replace a typical rate cell
    mrate = re.search(
        r"\{row\.commissionPercent\s*==\s*null\s*\?[\s\S]{0,80}?Number\(row\.commissionPercent\)[\s\S]{0,20}?\}",
        pt2,
    )
    if mrate:
        pt2 = (
            pt2[: mrate.start()]
            + '{row.effectiveCommissionPercent != null\n                        ? `${Number(row.effectiveCommissionPercent)}%`\n                        : row.commissionPercent == null\n                          ? "Shop default"\n                          : `${Number(row.commissionPercent)}%`}'
            + pt2[mrate.end() :]
        )
        print("OK panel rate cell")
    else:
        print("WARN panel rate cell not found")

if pt2 != pt:
    panel.write_text(pt2, encoding="utf-8")
    print("OK panel")
else:
    print("panel unchanged")

print("\n==== ALL DONE ====")
