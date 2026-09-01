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
const secret = process.env.JWT_SECRET_KEY;
const token = jwt.sign(
  { _id: "+966666663", role: "+966504369794__Supplier" },
  secret,
  { expiresIn: "1h" },
);

(async () => {
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch("http://127.0.0.1:8086/api/v1/machines?offset=0&limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await r.text();
      console.log("status", r.status, text.slice(0, 500));
      return;
    } catch (e) {
      console.log("wait", i, e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
})();
