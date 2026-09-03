import {
  AbilityBuilder,
  createMongoAbility,
  subject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import {
  isSupportAudience,
  normalizeBuiltInRole,
  ROLES,
  SUPPORT_AUDIENCE_SUBJECT,
} from './roles';

/**
 * Central CASL permission definitions — the single source of truth for
 * what each role can do. Route gating happens in the `authorize`
 * middleware; ownership checks happen in controllers via
 * `req.ability.can(action, subject('Product', doc))`.
 *
 * Role vocabulary (product ↔ code):
 *   Vendor      = Vendor      (owns products/machines/wallet)
 *   Shop Owner  = ShopOwner
 *   Super Admin = SuperAdmin
 */

export type Action =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'pay';

export type SubjectName =
  // Every *write* to a user account, whatever their role. Reads of a specific
  // directory go through the per-role subjects below.
  | 'User'
  // One subject per staff/shopper directory, because the dashboard has a page
  // each and they must be grantable one at a time — a single `User` subject
  // would open Customers, Vendors, Shop Owners and Staff together. They gate
  // *reads* only; `User` still gates every write.
  | 'Customer'
  | 'Vendor'
  | 'ShopOwner'
  | 'Staff'
  | 'Support'
  // The SuperAdmin's internal roster — SuperAdmin, Support agents, and
  // custom-role Staff — for the Team directory. Deliberately excludes
  // ShopOwner/Vendor, who run their own separate shop-level operations.
  // Read-only, and granted unconditionally in code (not assignable via a
  // custom role's own rule rows) — see the `Conversation`/`Message` grants
  // this mirrors.
  | 'Team'
  | 'Shop'
  | 'Product'
  | 'Machine'
  | 'Box'
  | 'Group'
  | 'Purchase'
  | 'Wallet'
  | 'Transaction'
  | 'Withdrawal'
  /** Vendor asks Shop Admin to host a machine in their shop. */
  | 'PlacementRequest'
  | 'Option'
  | 'Event'
  | 'Gift'
  | 'Conversation'
  | 'Message'
  // Client-facing subjects: gate admin-panel sections (CMS content, docs,
  // payment-provider settings) that have no dedicated REST controllers here.
  | 'Content'
  | 'Doc'
  | 'PaymentProvider'
  // Platform role reference data (label/description); rules stay in code.
  | 'Role'
  | 'all';

export type AppAbility = MongoAbility;

export interface AbilityUser {
  _id: string;
  role: string;
  /** Shop the staff user was assigned to on creation. */
  shopId?: string | null;
  /** Shops this staff user created (appended by `shops.create`). */
  ownedShopIds?: string[] | null;
  /**
   * The audiences this agent answers "contact support" for — a `Support`
   * account or a custom-role Staff member holding one or more audiences.
   */
  supportAudiences?: string[] | null;
  /** Owning Vendor / ShopOwner id for tenant staff. */
  tenantId?: string | null;
  /** `Vendor` or `ShopOwner` when tenantId is set. */
  tenantRole?: string | null;
}

/**
 * Every shop a staff user administers: the one they were assigned plus the
 * ones they created. Materialized on the user document rather than resolved
 * by a join, because `rulesFor` serializes these conditions to the client —
 * a rule has to be a static value, and passport already reloads the full user
 * on every request, so this costs no extra query.
 */
export const shopScopeOf = (user: AbilityUser): string[] => {
  // Tenant ShopOwner staff inherit the parent's shops via stamped
  // `ownedShopIds` / `shopId` (copied at create). Conditions must stay
  // static values because `rulesFor` serializes them to clients.
  const ids = new Set<string>();
  if (user.shopId) ids.add(String(user.shopId));
  for (const id of user.ownedShopIds ?? []) {
    if (id) ids.add(String(id));
  }
  return [...ids];
};

/**
 * Vendor ids this user may act as. Built-in Vendors own themselves; tenant
 * staff inherit their parent's vendor id via `tenantId`.
 */
export const vendorScopeOf = (user: AbilityUser): string[] => {
  if (user.tenantRole === 'Vendor' && user.tenantId) {
    return [String(user.tenantId)];
  }
  const role = normalizeBuiltInRole(user.role);
  if (role === ROLES.VENDOR) return [String(user._id)];
  return [];
};

/* ------------------------------------------------------------------ */
/* Custom roles                                                        */
/*                                                                     */
/* Built-in roles (SuperAdmin / ShopOwner / Vendor / Customer / Guest) are   */
/* defined in code below. Custom roles are created from the                 */
/* dashboard and stored in the `roles` collection as simple rule rows; */
/* the repo loads them into this in-process registry at boot and after */
/* every mutation.                                                     */
/* ------------------------------------------------------------------ */

export type RuleScope =
  | 'all'
  | 'own-shop'
  | 'own-vendor'
  | 'own-customer'
  | 'self'
  | 'assigned-machine'
  | 'assigned-support';

export interface RuleRow {
  action: Action;
  subject: SubjectName;
  scope: RuleScope;
}

/** Grantable via custom roles — deliberately excludes the 'manage' wildcard. */
export const ASSIGNABLE_ACTIONS: Action[] = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'reject',
  'pay',
];

/** Grantable via custom roles — deliberately excludes 'all'. */
export const ASSIGNABLE_SUBJECTS: SubjectName[] = [
  'User',
  'Customer',
  'Vendor',
  'ShopOwner',
  'Staff',
  'Support',
  'Shop',
  'Product',
  'Machine',
  'Box',
  'Group',
  'Purchase',
  'Wallet',
  'Transaction',
  'Withdrawal',
  'PlacementRequest',
  'Option',
  'Event',
  'Gift',
  'Conversation',
  'Message',
  'Content',
  'Doc',
  'PaymentProvider',
  'Role',
];

export const RULE_SCOPES: RuleScope[] = [
  'all',
  'own-shop',
  'own-vendor',
  'own-customer',
  'self',
  'assigned-machine',
  'assigned-support',
];

/**
 * Identity of a permission, ignoring scope: one action on one subject. Two rows
 * differing only by scope still grant the same permission twice, and the
 * dashboard builder writes every row as `all`, so the pair is the right key.
 */
export const permissionKey = (
  row: Pick<RuleRow, 'action' | 'subject' | 'scope'>,
): string => `${row.action}:${row.subject}:${row.scope}`;

/**
 * Canonical, order-independent signature of a whole rule set — used to spot two
 * roles that grant exactly the same thing under different names.
 */
export const rulesSignature = (rows: readonly RuleRow[]): string =>
  [...new Set(rows.map(permissionKey))].sort().join('|');

/** Returns an error message, or null when the rows are valid. */
export const validateRuleRows = (rows: unknown): string | null => {
  if (!Array.isArray(rows)) return 'rules must be an array.';
  const seen = new Set<string>();
  for (const row of rows) {
    const r = row as Partial<RuleRow> | null;
    if (!r || typeof r !== 'object') return 'Each rule must be an object.';
    if (!ASSIGNABLE_ACTIONS.includes(r.action as Action)) {
      return `Unknown action "${String(r.action)}".`;
    }
    if (!ASSIGNABLE_SUBJECTS.includes(r.subject as SubjectName)) {
      return `Unknown subject "${String(r.subject)}".`;
    }
    if (!RULE_SCOPES.includes(r.scope as RuleScope)) {
      return `Unknown scope "${String(r.scope)}".`;
    }
    const key = permissionKey(r as RuleRow);
    if (seen.has(key)) {
      return `Duplicate permission: ${r.action} on ${r.subject}.`;
    }
    seen.add(key);
  }
  return null;
};

/** Subjects a tenant-owned role must never grant. */
export const PLATFORM_SUBJECTS: ReadonlySet<SubjectName> = new Set([
  'Option',
  'Content',
  'PaymentProvider',
  'Role',
]);

/** Scopes a tenant-owned role may use. */
export const TENANT_RULE_SCOPES: readonly RuleScope[] = [
  'own-shop',
  'own-vendor',
  'self',
  'assigned-machine',
  'assigned-support',
];

/**
 * Extra checks when a Vendor / ShopOwner owns the role. UI hides platform
 * subjects; this is the server-side clamp so the API cannot mint them.
 */
export const validateTenantRuleRows = (rows: unknown): string | null => {
  const base = validateRuleRows(rows);
  if (base) return base;
  for (const row of rows as RuleRow[]) {
    if (PLATFORM_SUBJECTS.has(row.subject)) {
      return `Tenant roles cannot grant subject "${row.subject}".`;
    }
    if (!(TENANT_RULE_SCOPES as readonly string[]).includes(row.scope)) {
      return `Tenant roles cannot use scope "${row.scope}".`;
    }
  }
  return null;
};


const SCOPE_CONDITIONS: Record<
  RuleScope,
  | ((user: AbilityUser) => Record<string, unknown> | Record<string, unknown>[])
  | null
> = {
  all: null,
  'own-shop': (user) => ({ shopId: { $in: shopScopeOf(user) } }),
  'own-vendor': (user) => {
    const ids = vendorScopeOf(user);
    return ids.length <= 1
      ? { vendorId: ids[0] ?? String(user._id) }
      : { vendorId: { $in: ids } };
  },
  'own-customer': (user) => ({ customerId: String(user._id) }),
  self: (user) => ({ _id: String(user._id) }),
  'assigned-machine': (user) => ({ supplierIds: String(user._id) }),
  // Two rules (not `$or` in one condition): createMongoAbility's in-memory
  // matcher does not honor `$or`, while accessibleFilter unions multiple
  // conditional rules into `$or` for Mongo list queries.
  'assigned-support': (user) => [
    { supportUserId: String(user._id) },
    { 'supportAssignments.userId': String(user._id) },
  ],
};

const customRoles = new Map<string, RuleRow[]>();

/** Replace the registry contents (called by the roles repo at boot and on change). */
export const setCustomRoles = (roles: { name: string; rules: RuleRow[] }[]): void => {
  customRoles.clear();
  for (const role of roles) {
    customRoles.set(role.name, Array.isArray(role.rules) ? role.rules : []);
  }
};

export const isCustomRole = (role: string): boolean => customRoles.has(role);

/** Subjects every signed-in (or guest) user may browse. */
const CATALOG_SUBJECTS: SubjectName[] = ['Product', 'Shop', 'Machine', 'Group', 'Box', 'Event'];

/**
 * An audience opens exactly one directory: the agent has to see who they are
 * talking to. Called only from the Support and custom-role branches below —
 * never hoisted above the `switch` — so a Customer or Vendor carrying a stray
 * `supportAudiences` value can never gain a staff directory from it.
 */
const grantSupportAudiences = (
  can: AbilityBuilder<AppAbility>['can'],
  user: AbilityUser,
): void => {
  for (const audience of user.supportAudiences ?? []) {
    if (!isSupportAudience(audience)) continue;
    can('read', SUPPORT_AUDIENCE_SUBJECT[audience] as SubjectName);
  }
};

export const defineAbilityFor = (user: AbilityUser): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  const uid = String(user._id);
  const role = normalizeBuiltInRole(user.role);

  switch (role) {
    case ROLES.SUPER_ADMIN:
      can('manage', 'all');
      break;

    case ROLES.SHOP_OWNER: {
      // Shop owner: runs the shop (staff, orders, withdrawals) but the machine
      // floor is read-only — view list and sales; Vendors / supplier staff
      // edit, control, and fill. Platform config stays Super Admin–only.
      const shopIds = shopScopeOf(user);
      const inShop = { shopId: { $in: shopIds } };

      // Catalog browse without Machine: staff lists / revenue use shop-scoped
      // `read Machine`, and an unconditional catalog read would make
      // accessibleFilter return {} (every machine on the platform).
      can('read', ['Product', 'Shop', 'Group', 'Box', 'Event']);
      can('read', ['Content', 'Doc', 'PaymentProvider', 'Option', 'Role']);
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      // A new shop becomes theirs — `shops.create` appends it to ownedShopIds.
      can('create', 'Shop');

      // An admin with no shop administers nothing. Assign a shop (or let them
      // create one) to give this account any authority at all.
      if (shopIds.length === 0) break;

      can('manage', 'Shop', { _id: { $in: shopIds } });
      // Products belong to Vendors. Shop Admins manage staff and orders in
      // shop; machines are view-only (list + sales), not edit/control/fill.
      can('manage', ['User', 'Purchase'], inShop);
      can('read', 'Machine', inShop);
      // Staff directories use their own subjects. Vendors are *listed* via machines
      // in these shops (getByRole → listVendorsInShops) — Vendor user docs do
      // not carry shopId. The shopId condition still gates class-level `can`.
      can('read', ['Vendor', 'ShopOwner', 'Staff'], inShop);
      // Customers lack shopId; list comes from Purchases in these shops
      // (getByRole → listCustomersInShops). Class-level `read Customer` opens
      // the directory route; row access is purchase-checked in canTouchUser.
      can('read', 'Customer', inShop);
      // Machine telemetry for their own floor. Gifts are a customer-to-customer
      // artefact with no shop of their own, so no admin management verb.
      can('manage', 'Event', inShop);
      // Money is read-only (it moves only through purchases and withdrawals);
      // withdrawals get the explicit approval workflow verbs.
      can('read', ['Wallet', 'Transaction', 'Withdrawal'], inShop);
      can(['create', 'approve', 'reject', 'pay'], 'Withdrawal', inShop);
      // Vendor → shop machine placement: review incoming requests for own shops.
      can(['read', 'update'], 'PlacementRequest', inShop);
      // Tenant roles + staff (scoped to this ShopOwner).
      can('manage', 'Role', { ownerId: uid });
      can('create', 'Role');
      can('create', 'User', inShop);
      can('create', 'Staff', inShop);
      break;
    }

    case ROLES.VENDOR: {
      // Vendor: manages own products, services own machines and the boxes
      // inside them, sees own money, asks for withdrawals.
      const vendorIds = vendorScopeOf(user);
      const asVendor =
        vendorIds.length <= 1
          ? { vendorId: vendorIds[0] ?? uid }
          : { vendorId: { $in: vendorIds } };
      // Catalog browse for storefront pickers — but NOT Machine/Box: those
      // must stay vendor-scoped or the admin Machines list returns every
      // machine on the platform and ReferenceFields 403 on other vendors.
      can('read', ['Product', 'Shop', 'Group', 'Event']);
      can('read', ['Doc', 'PaymentProvider', 'Role']);
      can('create', 'Product');
      can(['update', 'delete'], 'Product', asVendor);
      // Machines are provisioned by admins; vendors only see/update their own.
      // Filling boxes is for supplier staff (`assigned-machine`), not the Vendor.
      can('read', 'Machine', asVendor);
      can('update', 'Machine', asVendor);
      can('read', ['Purchase', 'Wallet', 'Transaction'], asVendor);
      // Purchases on their machines can be adjusted by the vendor…
      can(['update', 'delete'], 'Purchase', asVendor);
      // …and vendors can also buy from machines like any shopper.
      can(['create', 'read'], 'Purchase', { customerId: uid });
      can(['read', 'create'], 'Withdrawal', asVendor);
      // Ask a Shop Admin to host one of this vendor's machines.
      can(['create', 'read'], 'PlacementRequest', asVendor);
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      // Resolve own name on machine list/edit ReferenceFields (vendorId → vendors).
      can('read', 'Vendor', { _id: uid });
      // Tenant roles + staff (scoped to this Vendor).
      can('manage', 'Role', { ownerId: uid });
      can('create', 'Role');
      can('manage', 'User', { tenantId: uid });
      can('create', 'User');
      // Full staff CRUD under this vendor (suppliers, fillers, etc.).
      can('manage', 'Staff', { tenantId: uid });
      can('create', 'Staff');
      break;
    }

    case ROLES.SUPPORT: {
      // Answers "contact support" for the audiences on their account. The
      // audience *is* the permission set: read that one directory so they know
      // who they are talking to, and chat. No catalog, no money, no writes to
      // anyone else's account — an agent who could edit the people they support
      // is a support agent with an admin's blast radius.
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can('read', 'Team');
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      grantSupportAudiences(can, user);
      break;
    }

    case ROLES.CUSTOMER:
    case 'Guest':
      can('read', CATALOG_SUBJECTS);
      // Checkout has to render the enabled payment methods.
      can('read', ['Doc', 'PaymentProvider']);
      // Shoppers own their cart end-to-end (guests included).
      can(['create', 'read', 'update', 'delete'], 'Purchase', { customerId: uid });
      can(['create', 'read'], 'Gift');
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      break;

    default: {
      // Custom role from the registry; unknown roles get no permissions.
      // Prefer the normalized name, then the raw string (dashboard-created roles
      // keep their exact casing).
      const rows = customRoles.get(role) ?? customRoles.get(user.role);

      // Fail closed on a role nobody defined. The baseline grants below are for
      // real custom roles; granting them before this check meant a user whose
      // `role` matched nothing — a typo, a role deleted straight from Mongo, a
      // half-finished import — still got a working account with self-management,
      // chat and the internal roster. Mongo has no foreign key to stop that
      // string existing, so this is the only place it can be caught.
      if (!rows) break;

      // Every other role case grants some of this unconditionally that this
      // one never did: self-management, and a way to reach the platform.
      // Self-management and chat are self-scoped (own account, own
      // conversations) so granting them universally carries no escalation
      // risk — a role holding neither otherwise has no way to change its own
      // password or ever contact the Super Admin, which is not a real
      // permission, just a broken account. `Team` is read-only and lists only
      // the internal roster (Super Admin, Support, other custom roles), not
      // anyone this role couldn't already message once it can read them.
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can('read', 'Team');
      if (rows) {
        for (const row of rows) {
          const condition = SCOPE_CONDITIONS[row.scope];
          if (condition) {
            const cond = condition(user);
            if (Array.isArray(cond)) {
              for (const c of cond) can(row.action, row.subject, c);
            } else {
              can(row.action, row.subject, cond);
            }
          } else {
            can(row.action, row.subject);
          }
        }
      }
      // A custom-role staff member may also hold support audiences, on top of
      // whatever their role's own rows grant — see `grantSupportAudiences`.
      grantSupportAudiences(can, user);
      break;
    }
  }

  return build();
};

/**
 * Tenant staff roles must stay within the creator's authority. Class-level
 * `can(action, subject)` covers most grants. Vendors may still delegate fill
 * (`update Box` / `read Machine` on assigned-machine) even though they do not
 * fill themselves — that is explicit product authority, not a privilege
 * escalation.
 */
export const validateRulesWithinOwnerAuthority = (
  rows: unknown,
  owner: AbilityUser,
): string | null => {
  if (!Array.isArray(rows)) return 'rules must be an array.';
  const ability = defineAbilityFor(owner);
  const ownerRole = normalizeBuiltInRole(owner.role);

  for (const row of rows as RuleRow[]) {
    const action = row.action as Action;
    const subjectName = row.subject as SubjectName;
    if (ability.can(action, subjectName)) continue;

    const isVendorFillDelegate =
      ownerRole === ROLES.VENDOR &&
      row.scope === 'assigned-machine' &&
      ((subjectName === 'Box' && action === 'update') ||
        (subjectName === 'Machine' && (action === 'read' || action === 'update')));

    const isSupportChatDelegate =
      (ownerRole === ROLES.VENDOR || ownerRole === ROLES.SHOP_OWNER) &&
      (subjectName === 'Conversation' || subjectName === 'Message') &&
      (action === 'read' || action === 'create' || action === 'update');

    if (isVendorFillDelegate || isSupportChatDelegate) continue;

    return `Cannot grant ${action} on ${subjectName} (${row.scope}): beyond your authority.`;
  }
  return null;
};

/**
 * JSON-safe rules for clients (admin panel / mobile) to rebuild the ability
 * with `createMongoAbility(rules)`. Raw (unpacked) on purpose: readable in
 * network payloads and needs no `@casl/ability/extra` import on clients.
 */
export const rulesFor = (user: AbilityUser): RawRuleOf<AppAbility>[] =>
  defineAbilityFor(user).rules as RawRuleOf<AppAbility>[];

/** Re-export so controllers don't import @casl/ability directly. */
export { subject };
