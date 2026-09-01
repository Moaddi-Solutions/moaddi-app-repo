const fs = require("fs");
const path = require("path");

// Load env/dev.env (supports `KEY = 'value'` with spaces/quotes)
const envPath = path.join(__dirname, "..", "env", "dev.env");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
  if (!m || line.trim().startsWith("#")) continue;
  let v = m[2].trim();
  if (
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith('"') && v.endsWith('"'))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[m[1]]) process.env[m[1]] = v;
}

const mongoose = require("mongoose");
const {
  setCustomRoles,
  defineAbilityFor,
  rulesFor,
} = require("../app/lib/ability.ts");

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("no MONGODB_URI");
  await mongoose.connect(uri);
  const roles = await mongoose.connection
    .collection("roles")
    .find({ builtIn: false })
    .project({ _id: 1, label: 1, rules: 1, ownerId: 1 })
    .toArray();
  console.log("customRoles", roles.length);
  for (const r of roles) {
    console.log(
      JSON.stringify({
        id: r._id,
        label: r.label,
        ownerId: r.ownerId,
        rules: r.rules,
      }),
    );
  }

  setCustomRoles(
    roles.map((r) => ({ name: String(r._id), rules: r.rules || [] })),
  );

  const users = await mongoose.connection
    .collection("users")
    .find({
      isDeleted: { $ne: true },
      role: { $nin: ["Vendor", "ShopOwner", "SuperAdmin", "Customer", "Guest", "Support", "vendor", "shopowner", "superadmin", "customer"] },
    })
    .project({ _id: 1, name: 1, role: 1, email: 1, phone: 1 })
    .limit(30)
    .toArray();
  console.log("custom-role users", users.length);
  for (const u of users) {
    const ability = defineAbilityFor(u);
    const canBox = ability.can("update", "Box");
    const canMachine = ability.can("update", "Machine");
    console.log(
      JSON.stringify({
        id: u._id,
        name: u.name,
        role: u.role,
        canUpdateBox: canBox,
        canUpdateMachine: canMachine,
        canStaffList: canBox || canMachine,
        ruleSubjects: [
          ...new Set(rulesFor(u).flatMap((r) => [].concat(r.subject))),
        ],
      }),
    );
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
