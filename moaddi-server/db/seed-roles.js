require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const Roles = require("../app/data/models/roles");
const { ROLES } = require("../app/lib/roles");

/**
 * Idempotent seed of the three platform roles. Permission rules live in
 * code (app/lib/ability.ts); this collection is reference data for the
 * admin UI and audits.
 */
const CORE_ROLES = [
  {
    _id: ROLES.SUPER_ADMIN,
    name: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description:
      "Full platform access: all vendors, all orders, all machines, all reports.",
  },
  {
    _id: ROLES.ADMIN,
    name: ROLES.ADMIN,
    label: "Shop Admin",
    description:
      "Manages shop settings, products, orders, machines, and shop-level analytics.",
  },
  {
    _id: ROLES.VENDOR,
    name: ROLES.VENDOR,
    label: "Supplier",
    description:
      "Manages their own products and machines; views their own orders, sales, and wallet.",
  },
];

async function seedRoles() {
  for (const role of CORE_ROLES) {
    await Roles.updateOne(
      { _id: role._id },
      { $set: { ...role, builtIn: true } },
      { upsert: true }
    );
    console.log(`Role ensured: ${role.label} (${role.name})`);
  }
}

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
