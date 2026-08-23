require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");

const Users = require("../app/data/models/users");
const Roles = require("../app/data/models/roles");
const Purchases = require("../app/data/models/purchases");
const Wallets = require("../app/data/models/wallets");
const Withdrawals = require("../app/data/models/withdrawals");

/**
 * One-off migration: retire the `Admin` and `Supplier` roles.
 *
 *   1. Migrate the 3 `Admin` users to `role: 'ShopOwner'` (identical grants,
 *      see app/lib/ability.ts).
 *   2. Delete the 1 `Supplier` user, after confirming no purchases/wallets/
 *      withdrawals reference it (would orphan financial records otherwise).
 *   3. Delete the `Admin` / `Supplier` rows from the `roles` collection.
 *
 * Run once against env/dev.env. Not idempotent by design — safe to re-run
 * though, since step 1/3 become no-ops and step 2 just finds nothing.
 *
 *   npx tsx db/migrate-retire-roles.js
 */

async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }
  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log("Connected to MongoDB (LIVE — writes will be applied)");

  // --- Step 1: Admin -> ShopOwner -----------------------------------
  const adminUsersBefore = await Users.find({ role: { $regex: /^admin$/i } })
    .select("_id name role shopId")
    .lean();
  console.log("\n=== BEFORE: Admin users ===");
  console.log(JSON.stringify(adminUsersBefore, null, 2));

  const adminResult = await Users.updateMany(
    { role: { $regex: /^admin$/i } },
    { $set: { role: "ShopOwner" } }
  );
  console.log(`\nAdmin -> ShopOwner: matched ${adminResult.matchedCount}, modified ${adminResult.modifiedCount}`);

  const adminUsersAfter = await Users.find({ _id: { $in: adminUsersBefore.map((u) => u._id) } })
    .select("_id name role shopId")
    .lean();
  console.log("\n=== AFTER: same users ===");
  console.log(JSON.stringify(adminUsersAfter, null, 2));

  // --- Step 2: delete the Supplier user, after safety check ---------
  const supplierUsersBefore = await Users.find({ role: { $regex: /^supplier$/i } })
    .select("_id name role phone")
    .lean();
  console.log("\n=== BEFORE: Supplier users ===");
  console.log(JSON.stringify(supplierUsersBefore, null, 2));

  for (const s of supplierUsersBefore) {
    const id = s._id;
    const refs = {
      purchasesAsCustomer: await Purchases.countDocuments({ customerId: id }),
      purchasesAsVendor: await Purchases.countDocuments({ vendorId: id }),
      wallets: await Wallets.countDocuments({ vendorId: id }),
      withdrawals: await Withdrawals.countDocuments({ vendorId: id }),
    };
    const total = Object.values(refs).reduce((a, b) => a + b, 0);
    console.log(`References for ${id}:`, refs);
    if (total > 0) {
      console.error(
        `\nSTOP: user ${id} has ${total} referencing financial record(s). Not deleting. Report back.`
      );
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  const supplierDeleteResult = await Users.deleteMany({ role: { $regex: /^supplier$/i } });
  console.log(`\nSupplier users deleted: ${supplierDeleteResult.deletedCount}`);

  // --- Step 3: drop Admin / Supplier rows from roles collection -----
  const rolesBefore = await Roles.find({ _id: { $in: ["Admin", "Supplier"] } }).lean();
  console.log("\n=== BEFORE: roles collection rows ===");
  console.log(JSON.stringify(rolesBefore, null, 2));

  const rolesDeleteResult = await Roles.deleteMany({ _id: { $in: ["Admin", "Supplier"] } });
  console.log(`\nRoles rows deleted: ${rolesDeleteResult.deletedCount}`);

  console.log("\n=== SUMMARY ===");
  console.log({
    adminUsersMigrated: adminResult.modifiedCount,
    supplierUsersDeleted: supplierDeleteResult.deletedCount,
    roleRowsDeleted: rolesDeleteResult.deletedCount,
  });

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
