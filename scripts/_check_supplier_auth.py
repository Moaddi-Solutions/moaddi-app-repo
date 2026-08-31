from pathlib import Path
import re

root = Path(r"c:\COURSES\work\mostaql")
ability = (root / "moaddi-server/app/lib/ability.ts").read_text(encoding="utf-8")
print("=== define export ===")
print(re.findall(r"export const define\w+", ability))
print("=== SCOPE_CONDITIONS keys ===")
m = re.search(r"SCOPE_CONDITIONS[\s\S]*?=\s*\{([\s\S]*?)\n\};", ability)
if m:
    print(re.findall(r"'([^']+)':", m.group(1)))
print("=== setCustom / customRoles ===")
for l in ability.splitlines():
    if "setCustom" in l or "customRoles" in l or "CustomRole" in l:
        print(l.strip())

auth = (root / "moaddi-server/app/routes/middlewares/authorize.ts").read_text(encoding="utf-8")
print("=== authorize ===")
for l in auth.splitlines():
    if "import" in l or "withAbility" in l or "req." in l:
        print(l)

m = (root / "moaddi-server/app/routes/controllers/machines.js").read_text(encoding="utf-8")
print("=== machines list gate ===")
for i, l in enumerate(m.splitlines()[23:80], start=24):
    print(f"{i}:{l}")

rc = (root / "moaddi-next/app/(admin)/components/resources/roles/ruleChoices.js").read_text(
    encoding="utf-8"
)
print("=== ruleChoices fill / assigned ===")
for i, l in enumerate(rc.splitlines(), 1):
    if "fill" in l.lower() or "assigned-machine" in l or "fixedScope" in l:
        print(f"{i}:{l}")

roles = root / "moaddi-server/app/data/repos/roles.js"
if roles.exists():
    t = roles.read_text(encoding="utf-8")
    print("=== roles repo custom load ===")
    for l in t.splitlines():
        if "setCustom" in l or "load" in l.lower() and "role" in l.lower():
            print(l.strip())

fa = (root / "moaddi-next/lib/ability.js").read_text(encoding="utf-8")
print("=== frontend machines mapping ===")
for i, l in enumerate(fa.splitlines(), 1):
    if "machines" in l or "orListSubject" in l or "Box" in l:
        print(f"{i}:{l}")
