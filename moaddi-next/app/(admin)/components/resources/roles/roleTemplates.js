import { matrixToRows } from "./ruleMatrix.js";
import { defaultScopeForRole, pagesForRole } from "./ruleChoices.js";

/**
 * Vendor-only preset: fill boxes on machines assigned to the staff user.
 * Creates a tenant custom role — does not revive built-in Supplier.
 */
export const SUPPLIER_TEMPLATE = {
  id: "supplier",
  label: "Supplier (fill machines)",
  description: "Update boxes on machines assigned to this staff member.",
};

/** Concrete ruleRows for PermissionMatrix source `ruleRows`. */
export function supplierTemplateRuleRows() {
  const pages = pagesForRole("Vendor");
  return matrixToRows(
    { fillMachines: new Set(["update"]) },
    // Machines page defaults to own-vendor (wrong for suppliers). Carry an
    // assigned-machine read so list/show work without Vendor ownership.
    [{ action: "read", subject: "Machine", scope: "assigned-machine" }],
    { defaultScope: "own-vendor", pages },
  );
}

/**
 * Tenant preset: chat support staff for shops (Shop Admin) or machines (Vendor).
 * Uses assigned-support so SupportAssignments / supportUserId routes work.
 */
export const SUPPORT_TEMPLATE = {
  id: "support",
  label: "Support (chat)",
  description:
    "Answer Contact chat for shops or machines assigned to this staff member.",
};

const CHAT_ACTIONS = ["create", "read", "update"];
const CHAT_SUBJECTS = ["Conversation", "Message"];

/**
 * @param {string} ownerRole  Signed-in creator role (`ShopOwner` / `Vendor`).
 */
export function supportTemplateRuleRows(ownerRole) {
  const normalized = String(ownerRole || "").toLowerCase();
  const role = normalized === "shopowner" ? "ShopOwner" : "Vendor";
  const pages = pagesForRole(role);
  // Prefer assigned-support (supportUserId / supportAssignments on shops &
  // machines). Conversation docs are participant-scoped in the chat repo;
  // these rows still authorize create/read/update at class level for tenants.
  const chatScope = "assigned-support";
  const carried = CHAT_SUBJECTS.flatMap((subject) =>
    CHAT_ACTIONS.map((action) => ({ action, subject, scope: chatScope })),
  );

  const matrix =
    role === "ShopOwner"
      ? { supportShops: new Set(["read", "update"]) }
      : { supportMachines: new Set(["read", "update"]) };

  return matrixToRows(matrix, carried, {
    defaultScope: defaultScopeForRole(role),
    pages,
  });
}
