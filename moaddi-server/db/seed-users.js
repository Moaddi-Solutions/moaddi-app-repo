require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const { updateExchangeRate } = require("../app/services/currency");
const seedUsers = require("./seeds/users.seed");

async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }

  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log("Connected to MongoDB");

  await updateExchangeRate();
  console.log("Exchange rates loaded for currency validation");

  await seedUsers();

  await mongoose.disconnect();
  console.log("User seed done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
