const fs = require("fs");
const p = fs.readFileSync("app/data/repos/purchases.ts", "utf8");
const idx = p.indexOf("const creditVendorsForPurchase");
let i = idx + 10,
  d = 0,
  s = false;
for (; i < p.length; i++) {
  if (p[i] === "{") {
    d++;
    s = true;
  } else if (p[i] === "}") {
    d--;
    if (s && d === 0) {
      i++;
      break;
    }
  }
}
const chunk = p.slice(idx, i);
fs.writeFileSync("scripts/_credit-fn-excerpt.ts", chunk);
console.log("error helpers", chunk.match(/isNo\w+/g));
console.log(
  "wallet calls",
  [...chunk.matchAll(/walletsRepo\.(\w+)/g)].map((m) => m[1]),
);
console.log(
  "txn calls",
  [...chunk.matchAll(/transactionsRepo\.(\w+)/g)].map((m) => m[1]),
);
const w = fs.readFileSync("app/data/repos/wallets.ts", "utf8");
console.log("wallet export block:");
console.log(w.slice(w.lastIndexOf("export =")));
