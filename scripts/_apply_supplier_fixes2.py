from pathlib import Path
import re

# Fix roleTemplates.js with correct export names from this codebase
Path(
    r"c:\COURSES\work\mostaql\moaddi-next\app\(admin)\components\resources\roles\roleTemplates.js"
).write_text(
    """import { matrixToRows } from \"./ruleMatrix.js\";
import { pagesForRole } from \"./ruleChoices.js\";

/**
 * Vendor-only preset: fill boxes on machines assigned to the staff user.
 * Creates a tenant custom role — does not revive built-in Supplier.
 */
export const SUPPLIER_TEMPLATE = {
  id: \"supplier\",
  label: \"Supplier (fill machines)\",
  description: \"Update boxes on machines assigned to this staff member.\",
};

/** Concrete ruleRows for PermissionMatrix source `ruleRows`. */
export function supplierTemplateRuleRows() {
  const pages = pagesForRole(\"Vendor\");
  return matrixToRows(
    { fillMachines: new Set([\"update\"]) },
    // Machines page defaults to own-vendor (wrong for suppliers). Carry an
    // assigned-machine read so list/show work without Vendor ownership.
    [{ action: \"read\", subject: \"Machine\", scope: \"assigned-machine\" }],
    { defaultScope: \"own-vendor\", pages },
  );
}
""",
    encoding="utf-8",
)
print("roleTemplates ok")

# Fix primeCustomRoles in roles repo
roles = Path(r"c:\COURSES\work\mostaql\moaddi-server\app\data\repos\roles.js")
text = roles.read_text(encoding="utf-8")
m = re.search(r"let (prime\w+) = async \(\) => \{[\s\S]*?\n\};", text)
if not m:
    raise SystemExit("prime fn not found: " + str([l for l in text.splitlines() if "prime" in l.lower()][:10]))
fn = m.group(1)
setter = re.search(r"(set\w+Roles)\(", m.group(0)).group(1)
replacement = f"""let {fn} = async () => {{
  // Prefer explicit `builtIn: false`, but also pick up tenant-owned rows that
  // were saved without flipping the schema default (`builtIn` defaults true).
  const custom = await Roles.find({{
    $or: [
      {{ builtIn: false }},
      {{ ownerId: {{ $exists: true, $nin: [null, ""] }} }},
    ],
  }}).lean();
  {setter}(
    custom.map((r) => ({{ name: r._id, rules: r.rules || [] }})),
  );
  return custom.length;
}};"""
roles.write_text(text[: m.start()] + replacement + text[m.end() :], encoding="utf-8")
print("roles prime ok", fn, setter)

# Verify template output
print("done")
