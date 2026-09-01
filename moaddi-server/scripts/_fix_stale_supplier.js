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
  const machines = mongoose.connection.db.collection("machines");
  const mid = "machine_1B:57:00:22:61:00";
  const validSupplier = "+966666663"; // ahmed mrsawy under KSJ vendor
  const before = await machines.findOne({ _id: mid });
  console.log("before supplierIds", before?.supplierIds);
  const next = (before?.supplierIds || []).filter(
    (id) => String(id) !== "+9666666667",
  );
  if (!next.includes(validSupplier)) next.push(validSupplier);
  await machines.updateOne({ _id: mid }, { $set: { supplierIds: next } });
  const after = await machines.findOne({ _id: mid });
  console.log("after supplierIds", after?.supplierIds);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
