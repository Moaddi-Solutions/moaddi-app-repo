from pathlib import Path

lines = Path(
    r"c:\COURSES\work\mostaql\moaddi-server\app\routes\controllers\machines.js"
).read_text(encoding="utf-8").splitlines()
for i in range(28, 55):
    print(i + 1, repr(lines[i]))
