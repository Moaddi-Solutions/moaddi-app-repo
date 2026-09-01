/**
 * Backfill supportAssignments from legacy supportUserId.
 * When supportUserId is set and supportAssignments is missing/empty,
 * write [{ audience: 'all', userId }]. Does not unset supportUserId.
 *
 * Usage (from moaddi-server):
 *   node db/migrate-support-assignments.js
 */
require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");

async function backfillCollection(collection, label) {
  const filter = {
    supportUserId: { $nin: [null, ""] },
    $or: [
      { supportAssignments: { $exists: false } },
      { supportAssignments: null },
      { supportAssignments: { $size: 0 } },
    ],
  };

  const docs = await collection.find(filter).project({ _id: 1, supportUserId: 1 }).toArray();
  let modified = 0;
  for (const doc of docs) {
    const userId = String(doc.supportUserId).trim();
    if (!userId) continue;
    const result = await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          supportAssignments: [{ audience: "all", userId }],
        },
      },
    );
    if (result.modifiedCount) modified += 1;
  }
  console.log(`${label}: scanned ${docs.length}, modified ${modified}`);
  return modified;
}

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
  await backfillCollection(db.collection("shops"), "shops");
  await backfillCollection(db.collection("machines"), "machines");

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
