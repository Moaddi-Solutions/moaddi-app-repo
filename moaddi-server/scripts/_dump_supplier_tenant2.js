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

  const ids = ["+9666666667", "9666666667", "+96666666667"];
  for (const id of ids) {
    const u = await users.findOne({ _id: id });
    console.log("lookup", id, u ? { name: u.name, role: u.role, tenantId: u.tenantId } : null);
  }

  const fuzzy = await users
    .find({ _id: { $regex: "6666666" } })
    .project({ _id: 1, name: 1, role: 1, tenantId: 1 })
    .toArray();
  console.log("fuzzy666", fuzzy);

  const m = await machines.findOne({ mac: /1[Bb]:57:00:22:61:00/i });
  const m2 = await machines.findOne({ name: /185700226100/ });
  console.log(
    "machine by mac",
    m && { _id: m._id, vendorId: m.vendorId, supplierIds: m.supplierIds, name: m.name },
  );
  console.log(
    "machine by name",
    m2 && { _id: m2._id, vendorId: m2.vendorId, supplierIds: m2.supplierIds, name: m2.name },
  );

  // Who is in suppliers list for KSJ vendor tenant?
  const staff = await users
    .find({ tenantId: "+966504369794", isDeleted: { $ne: true } })
    .project({ _id: 1, name: 1, role: 1, tenantId: 1 })
    .toArray();
  console.log("tenant staff", staff);

  // Any user named KSJ that isn't the vendor?
  const ksj = await users
    .find({ name: /^KSJ$/i })
    .project({ _id: 1, name: 1, role: 1, tenantId: 1 })
    .toArray();
  console.log("named KSJ", ksj);

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
