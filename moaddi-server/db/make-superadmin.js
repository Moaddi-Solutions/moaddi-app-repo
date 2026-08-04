require("dotenv").config({
  path: "./env/dev.env",
});

const mongoose = require("mongoose");
const config = require("../config");
const { getMongoConnectOptions } = require("../app/data/db/mongodb");
const Users = require("../app/data/models/users");
const { ROLES } = require("../app/lib/roles");

/**
 * Promotes an existing account to Super Admin — the only role allowed to
 * create, edit, or delete roles and to grant admin-level roles to others.
 * There is no way to mint the first Super Admin from the dashboard (that
 * would be a privilege-escalation hole), so it is done here.
 *
 *   npm run make:superadmin -- +201234567890
 *
 * Run with no argument to list the current staff accounts.
 */
async function listStaff() {
  const staff = await Users.find(
    { role: { $nin: [ROLES.CUSTOMER, "Guest"] } },
    { _id: 1, name: 1, role: 1 }
  ).lean();
  if (!staff.length) {
    console.log("No staff accounts found.");
    return;
  }
  console.log("Staff accounts:");
  for (const user of staff) {
    console.log(`  ${user._id}  ${user.role.padEnd(12)} ${user.name ?? ""}`);
  }
  console.log("\nRe-run with the account id to promote it:");
  console.log("  npm run make:superadmin -- <account-id>");
}

async function promote(id) {
  const user = await Users.findById(id, { role: 1 }).lean();
  if (!user) {
    throw new Error(`No user with id "${id}".`);
  }
  if (user.role === ROLES.SUPER_ADMIN) {
    console.log(`${id} is already a Super Admin.`);
    return;
  }
  // Targeted update rather than save(): the schema validates
  // `preferredCurrency` against live exchange rates, which a standalone
  // script has not loaded — no reason to re-validate unrelated fields.
  await Users.updateOne({ _id: id }, { $set: { role: ROLES.SUPER_ADMIN } });
  console.log(`${id}: ${user.role} -> ${ROLES.SUPER_ADMIN}`);
  console.log("Sign out and back in so the dashboard picks up the new rules.");
}

async function run() {
  if (!config.mongodb?.uri) {
    throw new Error("MONGODB_URI is not set. Check env/dev.env");
  }

  await mongoose.connect(config.mongodb.uri, getMongoConnectOptions(config.mongodb.uri));
  console.log("Connected to MongoDB");

  const id = process.argv[2];
  if (id) {
    await promote(id);
  } else {
    await listStaff();
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
