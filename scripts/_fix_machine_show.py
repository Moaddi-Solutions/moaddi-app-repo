from pathlib import Path
import re

show = Path(
    r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\machines\MachineShow.jsx"
)
text = show.read_text(encoding="utf-8")

# What does MachineList export?
lst = Path(
    r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\machines\MachineList.jsx"
).read_text(encoding="utf-8")
exports = re.findall(r"export const (\w+)", lst)
print("MachineList exports", exports)

# Prefer machineColumnsFor if present, else machineColumns
helper = "machineColumnsFor" if "machineColumnsFor" in exports else None
if not helper and "machineColumnsFor" in exports:
    helper = "machineColumnsFor"
# from earlier dump it was machineColumnsFor
for name in exports:
    if "For" in name and "machine" in name.lower():
        helper = name
        break
print("helper", helper)

if helper:
    text2 = text.replace(
        'import { machineColumns } from "./MachineList";',
        f'import {{ {helper} }} from "./MachineList";\nimport {{ useAbility }} from "@/(admin)/components/kit/useAbility";',
    )
    # Patch MachineDetails to use fill-only columns
    old = '''const MachineDetails = () => {
  const record = useRecordContext();
  if (!record) return null;

  const rows = [
    { key: "id", label: "ID", render: () => <span className="font-mono text-xs">{record._id}</span> },
    ...machineColumns,'''
    new = f'''const MachineDetails = () => {{
  const record = useRecordContext();
  const ability = useAbility();
  if (!record) return null;
  const fillOnly =
    ability.can("update", "Box") && !ability.can("update", "Machine");
  const columns = {helper}({{ fillOnly }});

  const rows = [
    {{ key: "id", label: "ID", render: () => <span className="font-mono text-xs">{{record._id}}</span> }},
    ...columns,'''
    if old not in text2:
        print("MachineDetails block not found exactly")
        # try looser
        print(repr(text2[text2.find("MachineDetails"):text2.find("MachineDetails")+400]))
    else:
        text2 = text2.replace(old, new)
        show.write_text(text2, encoding="utf-8")
        print("MachineShow updated")
else:
    print("no helper export; leave show as-is")
