const fs = require("fs");
const s = fs.readFileSync("app/(admin)/components/Dashboard.jsx", "utf8");
const lines = s.split(/\n/);
lines.forEach((l, i) => {
  if (/MachinesRevenue|machinesRevenue|RevenuePanel|isAdmin &&/.test(l)) {
    console.log(i + 1, l);
  }
});
console.log("--- around activity ---");
console.log(s.slice(s.indexOf("Activity + attention") - 100, s.indexOf("Activity + attention") + 500));
console.log("--- imports ---");
console.log(s.slice(0, 1200));
