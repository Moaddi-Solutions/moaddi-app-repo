from pathlib import Path
import re

S = Path(r"c:/COURSES/work/mostaql/moaddi-server")
N = Path(r"c:/COURSES/work/mostaql/moaddi-next")
V = Path(r"c:/COURSES/work/mostaql/vending_app")

uc = (S / "app/routes/controllers/users.js").read_text(encoding="utf-8")
assert "BASIC_ROLES" not in uc
assert "ROLES.CUSTOMER" in uc
assert "isBuiltInGrant" in uc
print("users OK")

m = (S / "app/data/repos/machines.js").read_text(encoding="utf-8")
assert "tenantVendorId" in m
assert "machine.supportUserId" in m
start = m.find("syncSupplierMachines")
print("boxes calls", re.findall(r"boxesRepo\.\w+", m[start : start + 1500]))
print("Users import", 'require("../models/users")' in m)

a = (S / "app/lib/ability.ts").read_text(encoding="utf-8")
print("permissionKey", re.search(r"export const permissionKey[\s\S]*?;", a).group(0))
print(
    "flags",
    "SubjectName" in a,
    "PLATFORM_SUBJECTS" in a,
    "validateTenantRuleRows" in a,
)
print("PaymentProvider", "PaymentProvider" in a)

mx = (N / "app/(admin)/components/resources/roles/ruleMatrix.js").read_text(
    encoding="utf-8"
)
lines = mx.splitlines()
for i, l in enumerate(lines):
    if "const key" in l:
        print("--- around", i + 1, "---")
        print("\n".join(lines[max(0, i - 4) : i + 3]))

shop = (V / "app/Shop/[shopId].jsx").read_text(encoding="utf-8")
print(
    "shop support",
    [l.strip() for l in shop.splitlines() if "useSupportUserId" in l],
)

rev = (S / "app/data/repos/machineRevenue.js").read_text(encoding="utf-8")
print("async revenue", bool(re.search(r"getRevenueByMachine\s*=\s*async", rev)))
print("effective in rev", "effectiveCommissionPercent" in rev)

panel = (N / "app/(admin)/components/MachinesRevenuePanel.jsx").read_text(
    encoding="utf-8"
)
print("panel", "Shop cut" in panel, "effectiveCommissionPercent" in panel)

r = (S / "app/data/repos/roles.js").read_text(encoding="utf-8")
print("roles tenant validate", "validateTenantRuleRows" in r)

# Check ContactTarget accepts object opts
ctx = (V / "app/(root)/context/ContactTargetContext.tsx").read_text(encoding="utf-8")
print(
    "useSupportUserId signature snippet:",
    re.search(r"export function useSupportUserId\([\s\S]*?\) \{", ctx).group(0)[:200],
)

# ability.test may break if permissionKey signature changed
print("ability tests mention permissionKey?")
t = (S / "app/lib/ability.test.ts").read_text(encoding="utf-8")
print("permissionKey in tests", "permissionKey" in t)
print("duplicate permission tests", "Duplicate permission" in t)
