from pathlib import Path
import re
import os

S = Path(r"c:/COURSES/work/mostaql/moaddi-server")
N = Path(r"c:/COURSES/work/mostaql/moaddi-next")
V = Path(r"c:/COURSES/work/mostaql/vending_app")

m = (S / "app/data/repos/machines.js").read_text(encoding="utf-8")
sm = re.search(r"(?:let|const) syncSupplierMachines = async[\s\S]*?\n\};\n", m)
print("SYNC FOUND", bool(sm))
print(sm.group(0) if sm else "none")
print("--- CREATE HEAD ---")
cm = re.search(r"let create = async \(machine\) => \{[\s\S]{0,900}", m)
print(cm.group(0) if cm else "none")
print("--- IMPORTS HEAD ---")
print(m[:700])

print("--- SHOPS CREATE ---")
s = (S / "app/data/repos/shops.js").read_text(encoding="utf-8")
print(re.search(r"let create = async[\s\S]{0,800}", s).group(0))

print("--- ABILITY ---")
a = (S / "app/lib/ability.ts").read_text(encoding="utf-8")
print(re.search(r"export const permissionKey[\s\S]*?;\n", a).group(0))
print("validate", re.findall(r"export const (validate\w+)", a))
print("RULE_SCOPES", re.search(r"RULE_SCOPES[^=]*=\s*\[([^\]]+)\]", a).group(1))
print("row type hints", re.findall(r"export (?:type|interface) (\w*Rule\w*)", a)[:10])
print("subject type", re.findall(r"export type (\w*Subject\w*)", a)[:10])

print("--- MATRIX ---")
mx = (N / "app/(admin)/components/resources/roles/ruleMatrix.js").read_text(
    encoding="utf-8"
)
for i, l in enumerate(mx.splitlines(), 1):
    if "key" in l and ("action" in l or "subject" in l):
        print(i, l)

print("--- SHOP ---")
shop = (V / "app/Shop/[shopId].jsx").read_text(encoding="utf-8")
for l in shop.splitlines():
    if "upport" in l:
        print(l)

print("--- ROLES REQUIRE ---")
r = (S / "app/data/repos/roles.js").read_text(encoding="utf-8")
print(re.search(r"const \{[^}]+\} = require\(\"../../lib/ability\"\);", r).group(0))
print([l for l in r.splitlines() if "validateRule" in l])

print("--- REVENUE ---")
rev = (S / "app/data/repos/machineRevenue.js").read_text(encoding="utf-8")
ss = (S / "app/lib/shopScope.ts").read_text(encoding="utf-8")
print("effective in shopScope", "effectiveCommissionPercent" in ss)
print("exports", re.findall(r"export const (\w+)", ss))
for l in rev.splitlines():
    if "commission" in l.lower() or l.strip().startswith("return"):
        print(l)

print("--- PANEL FILES ---")
for root, dirs, files in os.walk(N / "app"):
    for f in files:
        if "evenue" in f or "Revenue" in f:
            print(Path(root) / f)
