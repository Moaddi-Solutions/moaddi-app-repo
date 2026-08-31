const fs = require("fs");
const a = fs.readFileSync("app/lib/accessibleFilter.ts", "utf8");
console.log(
  "accessibleFilter exports",
  [...a.matchAll(/export const (\w+)/g)].map((m) => m[1]),
);
const m = fs.readFileSync("app/data/models/machines.js", "utf8");
console.log("has isDeleted", m.includes("isDeleted"));
console.log("has isDeleted", m.includes("isDeleted"));
console.log("has isConnected", m.includes("isConnected"));
console.log("has isConnected", m.includes("isConnected"));
console.log("has commissionPercent", m.includes("commissionPercent"));
const money = fs.readFileSync("app/lib/money.ts", "utf8");
console.log(
  "money",
  [...money.matchAll(/export const (\w+)/g)].map((x) => x[1]),
);
const ctrl = fs.readFileSync("app/routes/controllers/machines.js", "utf8");
console.log(
  "ctrl helpers",
  [...ctrl.matchAll(/assert\w+/g)].map((x) => x[0]).slice(0, 5),
);
console.log("accessibleFilter import", ctrl.match(/accessibleFilter|accessibleFilter/));
