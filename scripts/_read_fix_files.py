from pathlib import Path

m = Path(
    r"c:\COURSES\work\mostaql\moaddi-server\app\routes\controllers\machines.js"
).read_text(encoding="utf-8")
print(m[:2800])
print("==== ROLE TEMPLATE ====")
print(
    Path(
        r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\roles\roleTemplates.js"
    ).read_text(encoding="utf-8")
)
print("==== ruleChoices fill / machines ====")
rc = Path(
    r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\roles\ruleChoices.js"
).read_text(encoding="utf-8")
for i, l in enumerate(rc.splitlines(), 1):
    if "fillMachines" in l or 'key: "machines"' in l or "fixedScope" in l:
        print(f"{i}:{l}")

# export name for prime
roles = Path(
    r"c:\COURSES\work\mostaql\moaddi-server\app\data\repos\roles.js"
).read_text(encoding="utf-8")
for i, l in enumerate(roles.splitlines(), 1):
    if "prime" in l.lower() or "module.exports" in l:
        print(f"roles{i}:{l}")
