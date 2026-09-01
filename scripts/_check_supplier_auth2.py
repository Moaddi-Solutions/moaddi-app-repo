from pathlib import Path
import re

root = Path(r"c:\COURSES\work\mostaql\moaddi-server")
ability = (root / "app/lib/ability.ts").read_text(encoding="utf-8")

# Print SCOPE_CONDITIONS block
idx = ability.find("SCOPE_CONDITIONS")
print(ability[idx:idx+900])
print("---")
# Print custom role default branch
idx = ability.find("default: {")
print(ability[idx:idx+900])
print("---")
roles = (root / "app/data/repos/roles.js").read_text(encoding="utf-8")
print("=== roles setCustomRoles call site ===")
for i,l in enumerate(roles.splitlines(),1):
    if "setCustomRoles" in l or "loadCustom" in l or "boot" in l.lower() or "init" in l.lower():
        print(f"{i}:{l}")
print("--- roles around setCustomRoles ---")
lines = roles.splitlines()
for i,l in enumerate(lines):
    if "setCustomRoles" in l:
        for j in range(max(0,i-15), min(len(lines), i+20)):
            print(f"{j+1}:{lines[j]}")
