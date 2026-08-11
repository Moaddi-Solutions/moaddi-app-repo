require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const seedRoles = require("./seeds/roles.seed");

/**
 * Standalone role seed. The same seed also runs as part of `npm run seed` and
 * at server boot, so this script is only needed to re-assert roles on demand.
 */
async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }

  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log("Connected to MongoDB");

  await seedRoles();

  await mongoose.disconnect();
  console.log("Role seed done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
