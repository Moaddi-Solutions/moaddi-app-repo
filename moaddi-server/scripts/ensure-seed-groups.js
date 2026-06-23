/**
 * Upsert seed groups without wiping existing data.
 * Safe to run when machines reference seed group IDs that are missing.
 */
require("dotenv").config({ path: "./env/dev.env" });

const mongoose = require("mongoose");
const moment = require("moment");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const Groups = require("../app/data/models/groups");
const ids = require("../db/seeds/ids");

const SEED_GROUPS = [
  { _id: String(ids.groups.main), name: "Main Group" },
  { _id: String(ids.groups.secondary), name: "Secondary Group" },
];

async function main() {
  await mongoose.connect(
    config.mongodb.uri,
    getMongoConnectOptions(config.mongodb.uri),
  );

  const now = moment().utc().add(config.timeDifference, "hours").toDate();

  for (const group of SEED_GROUPS) {
    const result = await Groups.updateOne(
      { _id: group._id },
      {
        $setOnInsert: { _id: group._id, created: now },
        $set: { name: group.name, updated: now },
      },
      { upsert: true },
    );
    console.log(
      result.upsertedCount ? `Created group ${group._id}` : `Group ${group._id} already exists`,
    );
  }

  const all = await Groups.find({}).select("_id name");
  console.log(
    "Groups in DB:",
    all.map((g) => ({ _id: String(g._id), name: g.name })),
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
