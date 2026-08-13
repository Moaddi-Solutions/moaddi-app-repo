const moment = require("moment");
const config = require("../../../config");
const Roles = require("../models/roles");
const Users = require("../models/users");
const {
  rulesFor,
  setCustomRoles,
  validateRuleRows,
} = require("../../lib/ability");
const { ROLES } = require("../../lib/roles");

/**
 * Roles are reference data plus, for custom roles, DB-stored rule rows.
 * Built-in role rules live in code (app/lib/ability.ts); custom role rows
 * are loaded into the in-process ability registry here — at boot
 * (primeCustomRoles) and after every mutation.
 */

const RESERVED_ROLE_NAMES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VENDOR,
  ROLES.SUPPLIER,
  ROLES.CUSTOMER,
  "Guest",
].map((r) => r.toLowerCase());

const now = () => moment().utc().add(config.timeDifference, "hours");

/** Each role is returned with a computed `rules` snapshot (CASL raw rules)
 *  for display, plus the editable `ruleRows` for custom roles. */
const shape = (role) => ({
  ...role,
  ruleRows: role.builtIn ? [] : role.rules || [],
  rules: rulesFor({ _id: "role-preview", role: role._id }),
});

/** Load all custom roles into the ability registry. */
let primeCustomRoles = async () => {
  const custom = await Roles.find({ builtIn: false }).lean();
  setCustomRoles(
    custom.map((r) => ({ name: r._id, rules: r.rules || [] }))
  );
  return custom.length;
};

let list = async () => {
  const data = await Roles.find({}).sort({ builtIn: -1, _id: 1 }).lean();
  return { data: data.map(shape), total: data.length };
};

let getById = async (roleId) => {
  const role = await Roles.findOne({ _id: roleId }).lean();
  if (!role) {
    return Promise.reject({ message: "Role not found.", statusCode: 404 });
  }
  return shape(role);
};

let create = async ({ name, label, description, ruleRows }) => {
  const cleanName = String(name || "").trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{1,39}$/.test(cleanName)) {
    return Promise.reject({
      message:
        "Role name must start with a letter and use only letters, digits, - or _ (2-40 chars).",
      statusCode: 400,
    });
  }
  if (RESERVED_ROLE_NAMES.includes(cleanName.toLowerCase())) {
    return Promise.reject({
      message: "This role name is reserved.",
      statusCode: 409,
    });
  }
  const existing = await Roles.findOne({ _id: cleanName });
  if (existing) {
    return Promise.reject({ message: "Role already exists.", statusCode: 409 });
  }
  const rowsError = validateRuleRows(ruleRows || []);
  if (rowsError) {
    return Promise.reject({ message: rowsError, statusCode: 400 });
  }
  let role = new Roles({
    _id: cleanName,
    name: cleanName,
    label: String(label || cleanName).trim() || cleanName,
    description: String(description || "").trim() || cleanName,
    builtIn: false,
    rules: ruleRows || [],
    created: now(),
    updated: now(),
  });
  role = await role.save();
  await primeCustomRoles();
  return shape(role.toJSON());
};

/** Built-in roles: display fields only. Custom roles: rules too. */
let update = async (roleId, { label, description, ruleRows }) => {
  let role = await Roles.findOne({ _id: roleId });
  if (!role) {
    return Promise.reject({ message: "Role not found.", statusCode: 404 });
  }
  if (typeof label === "string" && label.trim()) role.label = label.trim();
  if (typeof description === "string") role.description = description;
  // Built-in role permissions live in code — ignore submitted rows (edit
  // forms send the full record, so they always include a ruleRows field).
  if (ruleRows !== undefined && !role.builtIn) {
    const rowsError = validateRuleRows(ruleRows);
    if (rowsError) {
      return Promise.reject({ message: rowsError, statusCode: 400 });
    }
    role.rules = ruleRows;
    role.markModified("rules");
  }
  role.updated = now();
  role = await role.save();
  await primeCustomRoles();
  return shape(role.toJSON());
};

let remove = async (roleId) => {
  const role = await Roles.findOne({ _id: roleId });
  if (!role) {
    return Promise.reject({ message: "Role not found.", statusCode: 404 });
  }
  if (role.builtIn) {
    return Promise.reject({
      message: "Built-in roles cannot be deleted.",
      statusCode: 400,
    });
  }
  const assigned = await Users.countDocuments({ role: roleId, isDeleted: { $ne: true } });
  if (assigned > 0) {
    return Promise.reject({
      message: `Cannot delete: ${assigned} user(s) still have this role.`,
      statusCode: 409,
    });
  }
  await Roles.deleteOne({ _id: roleId });
  await primeCustomRoles();
  return { _id: roleId, deleted: true };
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  primeCustomRoles,
};
