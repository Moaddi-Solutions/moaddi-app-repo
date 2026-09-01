const fs = require("fs");
const p = "app/(admin)/components/Dashboard.jsx";
const s = fs.readFileSync(p, "utf8");
console.log("len", s.length);
console.log("has isAdmin", s.includes("isAdmin"));
console.log("has showMachines", s.includes("showMachines"));
console.log("has MachinesRevenue", s.includes("MachinesRevenue"));
const lines = s.split(/\n/);
lines.forEach((l, i) => {
  if (/sonner|RecentPayments|Activity|stats\.map|return \(/.test(l)) {
    console.log(i + 1, l.trim().slice(0, 140));
  }
});
// find the activity section start
const idx = s.indexOf("RecentPayments");
console.log("RecentPayments idx", idx);
console.log(JSON.stringify(s.slice(idx - 200, idx + 80)));
