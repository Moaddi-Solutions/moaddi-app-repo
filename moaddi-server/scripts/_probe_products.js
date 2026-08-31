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
const jwt = require("jsonwebtoken");
const token = jwt.sign(
  { _id: "+966666663", role: "+966504369794__Supplier" },
  process.env.JWT_SECRET_KEY,
  { expiresIn: "1h" },
);
const h = { Authorization: `Bearer ${token}` };
const vendor = "+966504369794";
(async () => {
  const url = `http://127.0.0.1:8086/api/v1/products?${new URLSearchParams({
    offset: "0",
    limit: "20",
    native: "true",
    filter: JSON.stringify({ vendorId: vendor }),
  })}`;
  const r = await fetch(url, { headers: h });
  const j = await r.json();
  console.log(
    "status",
    r.status,
    "total",
    j.total,
    "count",
    j.data?.length,
    "names",
    (j.data || []).slice(0, 5).map((p) => p.name),
  );
})();
