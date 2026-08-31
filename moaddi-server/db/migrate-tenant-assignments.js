/**
 * Backfill supplierIds / supportUserId defaults and re-stamp boxes so
 * assigned-machine rules match denormalized box rows.
 *
 * Usage (from moaddi-server):
 *   node db/migrate-tenant-assignments.js
 */
require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");

async function main() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }
  await mongoose.connect(
    config.mongodb.uri,
    getMongoConnectOptions(config.mongodb.uri),
  );
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const machines = db.collection("machines");
  const shops = db.collection("shops");
  const boxes = db.collection("boxes");

  const m1 = await machines.updateMany(
    { supplierIds: { $exists: false } },
    { $set: { supplierIds: [] } },
  );
  const m2 = await machines.updateMany(
    { supportUserId: { $exists: false } },
    { $set: { supportUserId: null } },
  );
  const s1 = await shops.updateMany(
    { supportUserId: { $exists: false } },
    { $set: { supportUserId: null } },
  );

  console.log(
    `machines.supplierIds backfilled: ${m1.modifiedCount}; supportUserId: ${m2.modifiedCount}`,
  );
  console.log(`shops.supportUserId backfilled: ${s1.modifiedCount}`);

  // Re-stamp every box from its machine's current owners.
  const cursor = machines.find({ isDeleted: { $ne: true } });
  let stamped = 0;
  for await (const machine of cursor) {
    const supplierIds = Array.isArray(machine.supplierIds)
      ? machine.supplierIds.map(String)
      : [];
    const result = await boxes.updateMany(
      { machineId: String(machine._id) },
      {
        $set: {
          vendorId: machine.vendorId ?? null,
          shopId: machine.shopId ?? null,
          supplierIds,
        },
      },
    );
    stamped += result.modifiedCount || 0;
  }
  console.log(`boxes re-stamped: ${stamped}`);

  await mongoose.disconnect();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
