require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");

const Users = require("../app/data/models/users");
const Shops = require("../app/data/models/shops");
const Machines = require("../app/data/models/machines");
const Boxes = require("../app/data/models/boxes");
const Products = require("../app/data/models/products");
const Purchases = require("../app/data/models/purchases");
const Events = require("../app/data/models/events");
const Wallets = require("../app/data/models/wallets");
const Withdrawals = require("../app/data/models/withdrawals");
const Transactions = require("../app/data/models/transactions");

/**
 * Backfills the denormalized `shopId` / `vendorId` columns that Shop Admin
 * authorization reads (see app/lib/ability.ts).
 *
 * Records created before shop scoping have these columns unset, and an unset
 * column matches no `$in` condition — so without this an admin sees an empty
 * dashboard. Idempotent: every step is a targeted updateMany, safe to re-run.
 *
 *   npm run backfill:shop-scope            # apply
 *   npm run backfill:shop-scope -- --dry   # report only
 */

const DRY = process.argv.includes("--dry");

const step = async (label, run) => {
  if (DRY) {
    const n = await run(true);
    console.log(`[dry] ${label}: ${n} document(s) would change`);
    return n;
  }
  const n = await run(false);
  console.log(`${label}: ${n} document(s) updated`);
  return n;
};

/** Vendors → the shop on their user record. */
const vendorShopMap = async () => {
  const staff = await Users.find({ isDeleted: { $ne: true } })
    .select("_id shopId")
    .lean();
  const map = new Map();
  for (const u of staff) {
    if (u.shopId) map.set(String(u._id), String(u.shopId));
  }
  return map;
};

async function backfill() {
  // 1. ownedShopIds — every shop already records who created it (null for
  //    shops that predate the field, which stay Super-Admin-only until an
  //    admin is assigned to them).
  await step("users.ownedShopIds", async (dry) => {
    const shops = await Shops.find({ createdBy: { $nin: [null, ""] } })
      .select("_id createdBy")
      .lean();
    if (dry) return shops.length;
    let n = 0;
    for (const shop of shops) {
      const r = await Users.updateOne(
        { _id: String(shop.createdBy) },
        { $addToSet: { ownedShopIds: String(shop._id) } }
      );
      n += r.modifiedCount ?? 0;
    }
    return n;
  });

  // 2. Boxes inherit vendor + shop from their machine.
  await step("boxes.vendorId/shopId", async (dry) => {
    const machines = await Machines.find({})
      .select("_id vendorId shopId")
      .lean();
    if (dry) return Boxes.countDocuments({});
    let n = 0;
    for (const m of machines) {
      const r = await Boxes.updateMany(
        { machineId: String(m._id) },
        {
          $set: {
            vendorId: m.vendorId ? String(m.vendorId) : null,
            shopId: m.shopId ? String(m.shopId) : null,
          },
        }
      );
      n += r.modifiedCount ?? 0;
    }
    return n;
  });

  // 3. Events inherit shop from their machine.
  await step("events.shopId", async (dry) => {
    const machines = await Machines.find({ shopId: { $nin: [null, ""] } })
      .select("_id shopId")
      .lean();
    if (dry) return Events.countDocuments({ shopId: null });
    let n = 0;
    for (const m of machines) {
      const r = await Events.updateMany(
        { machineId: String(m._id) },
        { $set: { shopId: String(m.shopId) } }
      );
      n += r.modifiedCount ?? 0;
    }
    return n;
  });

  // 4. Purchases take the shop and supplier of the machine they were bought
  //    from. This is the machine's owner *now* — the best available
  //    approximation, since neither was recorded historically. Without these
  //    two columns a Shop Admin's orders list and a supplier's sales list are
  //    both empty, because an unset field matches no `$in` / equality rule.
  await step("purchases.shopId+vendorId", async (dry) => {
    const machines = await Machines.find({
      $or: [{ shopId: { $nin: [null, ""] } }, { vendorId: { $nin: [null, ""] } }],
    })
      .select("_id shopId vendorId")
      .lean();
    if (dry) {
      return Purchases.countDocuments({
        $or: [{ shopId: null }, { vendorId: null }, { vendorId: { $exists: false } }],
      });
    }
    let n = 0;
    for (const m of machines) {
      const set = {};
      if (m.shopId) set.shopId = String(m.shopId);
      if (m.vendorId) set.vendorId = String(m.vendorId);
      if (Object.keys(set).length === 0) continue;
      const r = await Purchases.updateMany({ machineId: String(m._id) }, { $set: set });
      n += r.modifiedCount ?? 0;
    }
    return n;
  });

  // 5. Products, wallets, withdrawals and transactions follow their vendor.
  const vendors = await vendorShopMap();
  for (const [label, Model] of [
    ["products.shopId", Products],
    ["wallets.shopId", Wallets],
    ["withdrawals.shopId", Withdrawals],
    ["transactions.shopId", Transactions],
  ]) {
    await step(label, async (dry) => {
      if (dry) return Model.countDocuments({ shopId: null });
      let n = 0;
      for (const [vendorId, shopId] of vendors) {
        const r = await Model.updateMany(
          { vendorId },
          { $set: { shopId } }
        );
        n += r.modifiedCount ?? 0;
      }
      return n;
    });
  }

  // A parting warning: an Admin with no shop now administers nothing, which is
  // the intended strict behaviour but easy to mistake for a broken deploy.
  const orphanAdmins = await Users.find({
    role: "Admin",
    isDeleted: { $ne: true },
    $or: [
      { shopId: { $in: [null, ""] } },
      { shopId: { $exists: false } },
    ],
    ownedShopIds: { $in: [null, []] },
  })
    .select("_id name")
    .lean();

  if (orphanAdmins.length) {
    console.log(
      `\n⚠  ${orphanAdmins.length} Shop Admin account(s) have no shop and will ` +
        `see an empty dashboard until one is assigned:`
    );
    for (const a of orphanAdmins) console.log(`   - ${a._id} (${a.name})`);
    console.log(
      "   Assign a shop on each account, or promote them with `npm run make:superadmin`."
    );
  }
}

async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }

  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log(`Connected to MongoDB${DRY ? " (dry run — nothing will change)" : ""}`);

  await backfill();

  await mongoose.disconnect();
  console.log(DRY ? "\nDry run done." : "\nShop-scope backfill done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
