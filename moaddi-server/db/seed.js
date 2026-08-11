require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const { updateExchangeRate } = require("../app/services/currency");

const seedRoles = require("./seeds/roles.seed");
const seedUsers = require("./seeds/users.seed");
const seedOptions = require("./seeds/options.seed");
const seedGroups = require("./seeds/groups.seed");
const seedShops = require("./seeds/shops.seed");
const seedProducts = require("./seeds/products.seed");
const seedMachines = require("./seeds/machines.seed");
const seedBoxes = require("./seeds/boxes.seed");
const seedPurchases = require("./seeds/purchases.seed");
const seedEvents = require("./seeds/events.seed");

async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }

  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log("Connected to MongoDB");

  await updateExchangeRate();
  console.log("Exchange rates loaded for currency validation");

  // Roles first — users reference them.
  await seedRoles();
  await seedUsers();
  await seedOptions();
  await seedGroups();
  await seedShops();
  await seedProducts();
  await seedMachines();
  await seedBoxes();
  await seedPurchases();
  await seedEvents();

  await mongoose.disconnect();
  console.log("All seeds done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
