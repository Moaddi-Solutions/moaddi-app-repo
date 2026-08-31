from pathlib import Path
import re

S = Path(r"c:/COURSES/work/mostaql/moaddi-server")
m = (S / "app/data/repos/machines.js").read_text(encoding="utf-8")
i = m.find('machine._id = "machine_"')
print("machine id region:", repr(m[i : i + 220]))
print("norm names in import:", re.search(r"normalize\w+", m[:900]))
print(re.findall(r"normalize\w+", m[:1200]))

s = (S / "app/data/repos/shops.js").read_text(encoding="utf-8")
j = s.find("shop.ownerId = ownerId")
print("shop owner region:", repr(s[j : j + 220]))
print("shop norms", re.findall(r"normalize\w+", s[:1200]))

a = (S / "app/lib/ability.ts").read_text(encoding="utf-8")
print(re.search(r"export const permissionKey[\s\S]*?;", a).group(0))
print("types", "SubjectName" in a, "RuleRow" in a, "RuleScope" in a)
print("validate", re.findall(r"export const validate\w+", a))

# PaymentProvider vs PaymentProvider
for name in ["Option", "Content", "PaymentProvider", "PaymentProvider", "Role"]:
    print(name, name in a)

r = (S / "app/data/repos/roles.js").read_text(encoding="utf-8")
print("roles require block:")
print(re.search(r"const \{\n[^}]+\n\} = require\(\"../../lib/ability\"\);", r).group(0))
print("create validate line:")
for l in r.splitlines():
    if "validateRuleRows" in l:
        print(repr(l))

mx = Path(r"c:/COURSES/work/mostaql/moaddi-next/app/(admin)/components/resources/roles/ruleMatrix.js").read_text(encoding="utf-8")
for i, l in enumerate(mx.splitlines(), 1):
    if "const key" in l:
        print(i, repr(l))

rev = (S / "app/data/repos/machineRevenue.js").read_text(encoding="utf-8")
print("revenue fn:", re.search(r"(?:const|let|async function) get\w+", rev).group(0))
print("return line:", [l for l in rev.splitlines() if "return { data" in l])
print("map line:", [l for l in rev.splitlines() if "machines.map" in l])

panel = Path(r"c:/COURSES/work/mostaql/moaddi-next/app/(admin)/components/MachinesRevenuePanel.jsx").read_text(encoding="utf-8")
for l in panel.splitlines():
    if any(x in l for x in ["cut", "commission", "default", "Sales"]):
        print("PANEL", l)
