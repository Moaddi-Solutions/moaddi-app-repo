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
const config = require("../config");
const secret = config.jwt?.secret || process.env.JWT_SECRET;
console.log("hasSecret", !!secret);

const token = jwt.sign(
  { _id: "+966666663", role: "+966504369794__Supplier" },
  secret,
  { expiresIn: "1h" },
);

// Prefer 127.0.0.1 — Node fetch to `localhost` can hit ::1 while the server
// only listens on IPv4.
const base = process.env.BASE_URL || "http://127.0.0.1:8086/api/v1";
(async () => {
  for (const url of [
    `${base}/machines?offset=0&limit=10`,
    `${base}/users/${encodeURIComponent("+966504369794")}`,
    `${base}/users/role/Vendor?offset=0&limit=1`,
  ]) {
    try {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await r.text();
      console.log("---", url, "=>", r.status);
      console.log(text.slice(0, 400));
    } catch (e) {
      console.log("---", url, "=> ERR", e.message);
    }
  }
})();
