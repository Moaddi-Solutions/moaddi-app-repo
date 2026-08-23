const moment = require("moment");
const config = require("../../../config");
const Roles = require("../models/roles");
const Users = require("../models/users");
const {
  rulesFor,
  rulesSignature,
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

/**
 * Names a custom role may not take. Compared after stripping everything but
 * letters and digits, so `Shop_Admin`, `shop-admin` and `SHOP ADMIN` all
 * collapse onto the built-in and are refused.
 *
 * This catches the systematic cases, not near-misses: `Vender` is a genuinely
 * different word and still gets through. Only fuzzy matching would stop that,
 * and it would eventually reject a name someone legitimately wants.
 */
const canonicalRoleName = (value) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const RESERVED_ROLE_NAMES = [
  ROLES.SUPER_ADMIN,
  ROLES.SHOP_OWNER,
  ROLES.VENDOR,
  ROLES.CUSTOMER,
  ROLES.SUPPORT,
  "Guest",
].map(canonicalRoleName);

const now = () => moment().utc().add(config.timeDifference, "hours");

/**
 * Reject a second role granting exactly what an existing one already grants —
 * two names for one job is a maintenance trap. Exact match only, never overlap:
 * "Accountant" and "Auditor" may legitimately be identical today and diverge
 * later. Built-ins are skipped: their rules live in code, so every one of them
 * has an empty `rules` array and they would all collide with each other.
 */
const assertNoRoleWithSameRules = async (ruleRows, excludeRoleId = null) => {
  const signature = rulesSignature(ruleRows || []);
  if (!signature) return;
  const others = await Roles.find({ builtIn: false }).lean();
  const clash = others.find(
    (r) =>
      String(r._id) !== String(excludeRoleId) &&
      rulesSignature(r.rules || []) === signature
  );
  if (clash) {
    return Promise.reject({
      message: `A role with these exact permissions already exists (${clash.label || clash._id}).`,
      statusCode: 409,
    });
  }
};

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

/**
 * Custom roles only. Built-in rules live in code and are not editable here, so
 * listing them offered rows whose every action was refused. `getById` stays
 * unfiltered so existing deep links to a built-in still resolve.
 */
let list = async () => {
  const data = await Roles.find({ builtIn: false }).sort({ _id: 1 }).lean();
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
  if (RESERVED_ROLE_NAMES.includes(canonicalRoleName(cleanName))) {
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
  await assertNoRoleWithSameRules(ruleRows);
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
    await assertNoRoleWithSameRules(ruleRows, roleId);
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
