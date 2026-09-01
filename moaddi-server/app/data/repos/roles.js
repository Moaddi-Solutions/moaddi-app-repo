const moment = require("moment");
const config = require("../../../config");
const Roles = require("../models/roles");
const Users = require("../models/users");
const {
  rulesFor,
  rulesSignature,
  setCustomRoles,
  validateRuleRows,
  validateTenantRuleRows,
  validateRulesWithinOwnerAuthority,
} = require("../../lib/ability");
const { ROLES } = require("../../lib/roles");

/**
 * Roles are reference data plus, for custom roles, DB-stored rule rows.
 * Built-in role rules live in code (app/lib/ability.ts); custom role rows
 * are loaded into the in-process ability registry here — at boot
 * (primeCustomRoles) and after every mutation.
 *
 * Tenant-owned custom roles (Vendor / ShopOwner staff) are namespaced as
 * `${ownerId}__${slug}` so global `_id` uniqueness stays intact.
 */

const canonicalRoleName = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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
 * Reject a second role granting exactly what an existing one already grants
 * within the same tenant (or the platform-unowned pool). Exact match only.
 */
const assertNoRoleWithSameRules = async (
  ruleRows,
  excludeRoleId = null,
  ownerId = null,
) => {
  const signature = rulesSignature(ruleRows || []);
  if (!signature) return;
  const filter = { builtIn: false };
  if (ownerId) {
    filter.ownerId = String(ownerId);
  } else {
    filter.$or = [{ ownerId: null }, { ownerId: { $exists: false } }];
  }
  const others = await Roles.find(filter).lean();
  const clash = others.find(
    (r) =>
      String(r._id) !== String(excludeRoleId) &&
      rulesSignature(r.rules || []) === signature,
  );
  if (clash) {
    return Promise.reject({
      message: `A role with these exact permissions already exists (${clash.label || clash._id}).`,
      statusCode: 409,
    });
  }
};

const shape = (role) => ({
  ...role,
  ruleRows: role.builtIn ? [] : role.rules || [],
  rules: rulesFor({ _id: "role-preview", role: role._id }),
});

let primeCustomRoles = async () => {
  // Prefer explicit `builtIn: false`, but also pick up tenant-owned rows that
  // were saved without flipping the schema default (`builtIn` defaults true).
  const custom = await Roles.find({
    $or: [
      { builtIn: false },
      { ownerId: { $exists: true, $nin: [null, ""] } },
    ],
  }).lean();
  setCustomRoles(
    custom.map((r) => ({ name: r._id, rules: r.rules || [] })),
  );
  return custom.length;
};

/**
 * @param {{ ownerId?: string|null, mineOnly?: boolean }} [opts]
 *   - Super Admin listing platform roles: `{ ownerId: null }`
 *   - Tenant listing own roles: `{ ownerId, mineOnly: true }`
 */
let list = async (opts = {}) => {
  const filter = { builtIn: false };
  if (opts.mineOnly && opts.ownerId) {
    filter.ownerId = String(opts.ownerId);
  } else if (opts.ownerId === null) {
    filter.$or = [{ ownerId: null }, { ownerId: { $exists: false } }];
  } else if (opts.ownerId) {
    filter.ownerId = String(opts.ownerId);
  }
  const data = await Roles.find(filter).sort({ _id: 1 }).lean();
  return { data: data.map(shape), total: data.length };
};

let listOwnedRoleIds = async (ownerId) => {
  if (!ownerId) return [];
  const rows = await Roles.find({
    builtIn: false,
    ownerId: String(ownerId),
  })
    .select("_id")
    .lean();
  return rows.map((r) => String(r._id));
};

let getById = async (roleId) => {
  const role = await Roles.findOne({ _id: roleId }).lean();
  if (!role) {
    return Promise.reject({ message: "Role not found.", statusCode: 404 });
  }
  return shape(role);
};

let create = async (
  { name, label, description, ruleRows, ownerId = null, ownerRole = null },
  ownerUser = null,
) => {
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
  const roleId = ownerId ? `${ownerId}__${cleanName}` : cleanName;
  const existing = await Roles.findOne({ _id: roleId });
  if (existing) {
    return Promise.reject({ message: "Role already exists.", statusCode: 409 });
  }
  const rowsError = ownerId
    ? validateTenantRuleRows(ruleRows || [])
    : validateRuleRows(ruleRows || []);
  if (rowsError) {
    return Promise.reject({ message: rowsError, statusCode: 400 });
  }
  if (ownerId && ownerUser) {
    const authorityError = validateRulesWithinOwnerAuthority(
      ruleRows || [],
      ownerUser,
    );
    if (authorityError) {
      return Promise.reject({ message: authorityError, statusCode: 400 });
    }
  }
  await assertNoRoleWithSameRules(ruleRows, null, ownerId);
  let role = new Roles({
    _id: roleId,
    name: roleId,
    label: String(label || cleanName).trim() || cleanName,
    description: String(description || "").trim() || cleanName,
    builtIn: false,
    rules: ruleRows || [],
    ownerId: ownerId ? String(ownerId) : null,
    ownerRole: ownerId ? String(ownerRole || "") : null,
    created: now(),
    updated: now(),
  });
  role = await role.save();
  await primeCustomRoles();
  return shape(role.toJSON());
};

let update = async (roleId, { label, description, ruleRows }, ownerUser = null) => {
  let role = await Roles.findOne({ _id: roleId });
  if (!role) {
    return Promise.reject({ message: "Role not found.", statusCode: 404 });
  }
  if (typeof label === "string" && label.trim()) role.label = label.trim();
  if (typeof description === "string") role.description = description;
  if (ruleRows !== undefined && !role.builtIn) {
    const rowsError = role.ownerId
      ? validateTenantRuleRows(ruleRows)
      : validateRuleRows(ruleRows);
    if (rowsError) {
      return Promise.reject({ message: rowsError, statusCode: 400 });
    }
    if (role.ownerId && ownerUser) {
      const authorityError = validateRulesWithinOwnerAuthority(
        ruleRows,
        ownerUser,
      );
      if (authorityError) {
        return Promise.reject({ message: authorityError, statusCode: 400 });
      }
    }
    await assertNoRoleWithSameRules(ruleRows, roleId, role.ownerId || null);
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
  const assigned = await Users.countDocuments({
    role: roleId,
    isDeleted: { $ne: true },
  });
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
  listOwnedRoleIds,
  getById,
  create,
  update,
  remove,
  primeCustomRoles,
};
