const mongoose = require("mongoose");
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
  )
    v = v.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = v;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");
  const machines = mongoose.connection.db.collection("machines");
  const id = "+9666666667";
  const u = await users.findOne({ _id: id });
  console.log(
    "user",
    JSON.stringify(
      u && {
        _id: u._id,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        tenantRole: u.tenantRole,
        shopId: u.shopId,
      },
      null,
      2,
    ),
  );
  // Also find KSJ vendor and ahmed
  const candidates = await users
    .find({
      $or: [
        { name: /ksj/i },
        { name: /ahmed/i },
        { name: /mosawy|mrsawy/i },
        { _id: /^\+966666666/ },
      ],
    })
    .project({ _id: 1, name: 1, role: 1, tenantId: 1, tenantRole: 1 })
    .limit(20)
    .toArray();
  console.log("candidates", JSON.stringify(candidates, null, 2));

  const m = await machines.findOne({ name: /KSJ185700226100/i });
  console.log(
    "machine",
    JSON.stringify(
      m && {
        _id: m._id,
        vendorId: m.vendorId,
        supplierIds: m.supplierIds,
        shopId: m.shopId,
      },
      null,
      2,
    ),
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
