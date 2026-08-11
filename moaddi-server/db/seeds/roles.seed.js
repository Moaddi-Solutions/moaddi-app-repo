const Roles = require("../../app/data/models/roles");
const { ROLES } = require("../../app/lib/roles");

/**
 * The three platform roles. Permission RULES live in code
 * (app/lib/ability.ts); these rows are reference data for the admin UI and
 * audits, so the seed is idempotent and safe to re-run on every setup.
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

/**
 * Upserts only the fields the seed owns — a Super Admin may have renamed the
 * label/description from the dashboard, and `builtIn: true` is what keeps the
 * role undeletable, so it is re-asserted every run.
 */
async function seedRoles({ quiet = false } = {}) {
  for (const role of CORE_ROLES) {
    const { _id, ...fields } = role;
    await Roles.updateOne(
      { _id },
      { $set: { builtIn: true }, $setOnInsert: fields },
      { upsert: true }
    );
    if (!quiet) console.log(`Role ensured: ${role.label} (${role.name})`);
  }
  return CORE_ROLES.length;
}

module.exports = seedRoles;
module.exports.CORE_ROLES = CORE_ROLES;
