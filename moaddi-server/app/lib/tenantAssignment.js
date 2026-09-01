const Users = require("../data/models/users");
const {
  ROLES,
  normalizeBuiltInRole,
  isSupportRouteAudience,
} = require("./roles");

/**
 * Tenant staff assignment helpers.
 *
 * Support / supplier ids on shops and machines must point at staff that belong
 * to the same tenant (the shop owner or the vendor). Never trust a bare id
 * from the client without this check.
 */

const notFound = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

/**
 * A user is in the given tenant when:
 *   - they ARE the tenant owner (Vendor / ShopOwner with matching _id), or
 *   - their stamped `tenantId` matches.
 */
const userInTenant = (user, tenantId) => {
  if (!user || !tenantId) return false;
  const id = String(user._id);
  const tid = String(tenantId);
  if (id === tid) return true;
  if (user.tenantId && String(user.tenantId) === tid) return true;
  return false;
};

/**
 * Validate a single support assignee. Empty / null clears the assignment.
 * @returns {string|null}
 */
const normalizeSupportUserId = async (supportUserId, tenantId) => {
  if (supportUserId == null || supportUserId === "") return null;
  const id = String(supportUserId).trim();
  if (!id) return null;
  if (!tenantId) {
    throw notFound("Cannot assign support without a tenant owner.");
  }
  const user = await Users.findOne({
    _id: id,
    isDeleted: { $ne: true },
  }).lean();
  if (!user || !userInTenant(user, tenantId)) {
    throw notFound("Support user must be staff in the same tenant.");
  }
  // Built-in platform roles are never "tenant support".
  const role = normalizeBuiltInRole(user.role);
  if (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.CUSTOMER ||
    role === "Guest"
  ) {
    throw notFound("Support user must be tenant staff.");
  }
  return id;
};

/**
 * Validate a many-to-many supplier list. Returns a deduped string[].
 */
const normalizeSupplierIds = async (supplierIds, tenantId) => {
  if (supplierIds == null) return [];
  if (!Array.isArray(supplierIds)) {
    throw notFound("supplierIds must be an array.");
  }
  const ids = [
    ...new Set(
      supplierIds.map((x) => String(x || "").trim()).filter(Boolean),
    ),
  ];
  // Empty list clears assignment — no tenant owner required (machine may not
  // have a vendorId yet on create).
  if (!ids.length) return [];
  if (!tenantId) {
    throw notFound("Cannot assign suppliers without a vendor owner.");
  }
  const users = await Users.find({
    _id: { $in: ids },
    isDeleted: { $ne: true },
  }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  for (const id of ids) {
    const user = byId.get(id);
    if (!user) {
      throw notFound(
        `Supplier ${id} was not found. Remove them from the list and pick staff from your Suppliers directory.`,
      );
    }
    if (!userInTenant(user, tenantId)) {
      throw notFound(
        `Supplier ${id} must be staff created under your vendor account (same tenant). Create them under Suppliers, then assign.`,
      );
    }
  }
  return ids;
};

/**
 * Drop missing / out-of-tenant supplier ids for read paths so edit forms do
 * not keep ghost chips that fail on the next save.
 */
const sanitizeSupplierIdsForRead = async (supplierIds, tenantId) => {
  if (!Array.isArray(supplierIds) || !supplierIds.length) return [];
  if (!tenantId) return [];
  const ids = [
    ...new Set(
      supplierIds.map((x) => String(x || "").trim()).filter(Boolean),
    ),
  ];
  const users = await Users.find({
    _id: { $in: ids },
    isDeleted: { $ne: true },
  }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return ids.filter((id) => {
    const user = byId.get(id);
    return user && userInTenant(user, tenantId);
  });
};

/**
 * Validate audience-keyed support rows for a shop or machine.
 * Unique audience per document; each userId must be same-tenant staff.
 * @returns {{ audience: string, userId: string }[]}
 */
const normalizeSupportAssignments = async (rows, tenantId) => {
  if (rows == null) return [];
  if (!Array.isArray(rows)) {
    throw notFound("supportAssignments must be an array.");
  }
  if (!rows.length) return [];
  if (!tenantId) {
    throw notFound("Cannot assign support without a tenant owner.");
  }
  // Validate shape / uniqueness before any DB call so unit tests stay offline.
  const seen = new Set();
  const pending = [];
  for (const row of rows) {
    const audience = row?.audience;
    const rawId = row?.userId == null ? "" : String(row.userId).trim();
    if (!isSupportRouteAudience(audience)) {
      throw notFound(`Unknown support audience "${audience}".`);
    }
    if (seen.has(audience)) {
      throw notFound(`Duplicate support audience "${audience}".`);
    }
    if (!rawId) {
      throw notFound("Each support assignment needs a userId.");
    }
    seen.add(audience);
    pending.push({ audience, rawId });
  }
  const out = [];
  for (const { audience, rawId } of pending) {
    const id = await normalizeSupportUserId(rawId, tenantId);
    if (!id) {
      throw notFound("Each support assignment needs a userId.");
    }
    out.push({ audience, userId: id });
  }
  return out;
};

module.exports = {
  userInTenant,
  normalizeSupportUserId,
  normalizeSupplierIds,
  sanitizeSupplierIdsForRead,
  normalizeSupportAssignments,
};
