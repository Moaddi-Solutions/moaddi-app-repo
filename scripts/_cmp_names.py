from pathlib import Path
import re

text = Path(
    r"c:\COURSES\work\mostaql\moaddi-server\app\routes\controllers\machines.js"
).read_text(encoding="utf-8")
names = re.findall(r"can\w*Staff\w*Machines", text)
print("unique:", sorted(set(names)))
for n in sorted(set(names)):
    print(n, [hex(ord(c)) for c in n])
