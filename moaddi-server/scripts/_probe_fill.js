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

const jwt = require("jsonwebtoken");
const token = jwt.sign(
  { _id: "+966666663", role: "+966504369794__Supplier" },
  process.env.JWT_SECRET_KEY,
  { expiresIn: "1h" },
);
const mid = "machine_F6:21:70:C0:00:03";
const h = { Authorization: `Bearer ${token}` };

(async () => {
  const checks = [
    ["GET machine", `http://127.0.0.1:8086/api/v1/machines/${encodeURIComponent(mid)}`],
    ["GET boxes by machine", `http://127.0.0.1:8086/api/v1/boxes/machine/${encodeURIComponent(mid)}`],
    ["GET products", `http://127.0.0.1:8086/api/v1/products?offset=0&limit=3`],
    ["GET vendor user", `http://127.0.0.1:8086/api/v1/users/${encodeURIComponent("+966504369794")}`],
  ];
  for (const [label, url] of checks) {
    try {
      const r = await fetch(url, { headers: h });
      const t = await r.text();
      console.log(label, r.status, t.slice(0, 250).replace(/\s+/g, " "));
    } catch (e) {
      console.log(label, "ERR", e.message);
    }
  }
})();
