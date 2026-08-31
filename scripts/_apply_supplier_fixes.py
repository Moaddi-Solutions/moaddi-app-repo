from pathlib import Path

# --- roleTemplates.js ---
rt = Path(
    r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\roles\roleTemplates.js"
)
rt.write_text(
    '''import { matrixToRows } from "./ruleMatrix.js";
import { pagesForRole } from "./ruleChoices.js";

/**
 * Vendor-only preset: fill boxes on machines assigned to the staff user.
 * Creates a tenant custom role — does not revive built-in Supplier.
 */
export const SUPPLIER_TEMPLATE = {
  id: "supplier",
  label: "Supplier (fill machines)",
  description: "Update boxes on machines assigned to this staff member.",
};

/** Concrete ruleRows for PermissionMatrix source `ruleRows`. */
export function supplierTemplateRuleRows() {
  const pages = pagesForRole("Vendor");
  return matrixToRows(
    { fillMachines: new Set(["update"]) },
    // Machines page defaults to own-vendor (wrong for suppliers). Carry an
    // assigned-machine read so list/show work without Vendor ownership.
    [{ action: "read", subject: "Machine", scope: "assigned-machine" }],
    { defaultScope: "own-vendor", pages },
  );
}
''',
    encoding="utf-8",
)
print("roleTemplates written")

# --- roles.js primeCustomRoles ---
roles = Path(r"c:\COURSES\work\mostaql\moaddi-server\app\data\repos\roles.js")
text = roles.read_text(encoding="utf-8")
old = '''let primeCustomRoles = async () => {
  const custom = await Roles.find({ builtIn: false }).lean();
  setCustomRoles(
    custom.map((r) => ({ name: r._id, rules: r.rules || [] })),
  );
  return custom.length;
};'''
new = '''let primeCustomRoles = async () => {
  // Prefer explicit `builtIn: false`, but also pick up tenant-owned rows that
  // were saved without flipping the schema default (`builtIn` defaults true).
  const custom = await Roles.find({
    $or: [
      { builtIn: false },
      { ownerId: { $exists: true, $nin: [null, ""] } },
    ],
  }).lean();
  setCustomRoles(
    custom.map((r) => ({ name: r._id, rules: r.rules || [] })),
  );
  return custom.length;
};'''
# try alternate naming
if old not in text:
    old2 = '''let primeCustomRoles = async () => {
  const custom = await Roles.find({ builtIn: false }).lean();
  setCustomRoles(
    custom.map((r) => ({ name: r._id, rules: r.rules || [] })),
  );
  return custom.length;
};'''
    # fuzzy: find the function
    import re
    m = re.search(
        r"let primeCustomRoles = async \(\) => \{[\s\S]*?\n\};",
        text,
    )
    if not m:
        # try primeCustomRoles alternate
        m = re.search(
            r"let prime\w+ = async \(\) => \{\n  const custom = await Roles\.find\(\{ builtIn: false \}\)[\s\S]*?\n\};",
            text,
        )
    if not m:
        print("prime block not found")
        print([l for l in text.splitlines() if "prime" in l.lower()][:20])
    else:
        text2 = text[: m.start()] + new + text[m.end() :]
        # fix function name to match original
        orig_name = re.search(r"let (prime\w+)", m.group(0)).group(1)
        text2 = text2.replace("let primeCustomRoles", f"let {orig_name}", 1)
        # also setCustomRoles vs setCustomRoles
        if "setCustomRoles" in m.group(0):
            text2 = text2.replace("setCustomRoles", "setCustomRoles")
        if "setCustomRoles" in m.group(0) and "setCustomRoles(" in new:
            # detect which setter name the file uses
            setter = "setCustomRoles" if "setCustomRoles" in text else "setCustomRoles"
            # from original block
            sm = re.search(r"(set\w+Roles)\(", m.group(0))
            if sm:
                text2 = text2.replace("setCustomRoles(", f"{sm.group(1)}(", 1)
        roles.write_text(text2, encoding="utf-8")
        print("roles prime updated", orig_name)
else:
    roles.write_text(text.replace(old, new), encoding="utf-8")
    print("roles prime updated exact")
