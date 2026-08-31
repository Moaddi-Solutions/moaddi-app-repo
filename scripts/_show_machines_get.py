from pathlib import Path
import re

t = Path(
    r"c:\COURSES\work\mostaql\moaddi-server\app\routes\controllers\machines.js"
).read_text(encoding="utf-8")
for m in re.finditer(
    r'router\.get\("/machines"[\s\S]*?return router',
    t,
):
    chunk = m.group(0)[:1200]
    print(chunk)
    break

# Find ensureStaff usage
for i, line in enumerate(t.splitlines(), 1):
    if "ensureStaff" in line or "canStaffList" in line or 'get("/machines"' in line:
        print(f"{i}:{line}")
