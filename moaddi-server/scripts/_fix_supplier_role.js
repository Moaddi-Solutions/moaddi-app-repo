const fs = require("fs");
const path = require("path");

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

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Roles = mongoose.connection.collection("roles");
  const Machines = mongoose.connection.collection("machines");

  const roleId = "+966504369794__Supplier";
  const supplierUserId = "+966666663";

  const role = await Roles.findOne({ _id: roleId });
  console.log(
    "before",
    JSON.stringify({ builtIn: role?.builtIn, rules: role?.rules, ownerId: role?.ownerId }),
  );

  const nextRules = [
    { action: "update", subject: "Box", scope: "assigned-machine" },
    { action: "read", subject: "Machine", scope: "assigned-machine" },
  ];
  const upd = await Roles.updateOne(
    { _id: roleId },
    { $set: { rules: nextRules, builtIn: false } },
  );
  console.log("modified", upd.modifiedCount, JSON.stringify(nextRules));

  const assigned = await Machines.find({
    supplierIds: supplierUserId,
    isDeleted: { $ne: true },
  })
    .project({ _id: 1, name: 1, supplierIds: 1, vendorId: 1 })
    .toArray();
  console.log("assigned", assigned.length, JSON.stringify(assigned));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
