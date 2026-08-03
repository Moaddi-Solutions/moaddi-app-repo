import {
  AbilityBuilder,
  createMongoAbility,
  subject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import { ROLES } from './roles';

/**
 * Central CASL permission definitions — the single source of truth for
 * what each role can do. Route gating happens in the `authorize`
 * middleware; ownership checks happen in controllers via
 * `req.ability.can(action, subject('Product', doc))`.
 *
 * Role vocabulary (product ↔ code):
 *   Supplier    = Vendor
 *   Shop Admin  = Admin
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
  | 'User'
  | 'Shop'
  | 'Product'
  | 'Machine'
  | 'Box'
  | 'Group'
  | 'Purchase'
  | 'Wallet'
  | 'Transaction'
  | 'Withdrawal'
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
}

/* ------------------------------------------------------------------ */
/* Custom roles                                                        */
/*                                                                     */
/* Built-in roles (SuperAdmin / Admin / Vendor / Customer / Guest) are */
/* defined in code below. Custom roles are created from the dashboard  */
/* and stored in the `roles` collection as simple rule rows; the repo  */
/* loads them into this in-process registry at boot and after every    */
/* mutation.                                                           */
/* ------------------------------------------------------------------ */

export type RuleScope = 'all' | 'own-vendor' | 'own-customer' | 'self';

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
  'Shop',
  'Product',
  'Machine',
  'Box',
  'Group',
  'Purchase',
  'Wallet',
  'Transaction',
  'Withdrawal',
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

export const RULE_SCOPES: RuleScope[] = ['all', 'own-vendor', 'own-customer', 'self'];

/** Returns an error message, or null when the rows are valid. */
export const validateRuleRows = (rows: unknown): string | null => {
  if (!Array.isArray(rows)) return 'rules must be an array.';
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
  }
  return null;
};

const SCOPE_CONDITIONS: Record<
  RuleScope,
  ((uid: string) => Record<string, string>) | null
> = {
  all: null,
  'own-vendor': (uid) => ({ vendorId: uid }),
  'own-customer': (uid) => ({ customerId: uid }),
  self: (uid) => ({ _id: uid }),
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

export const defineAbilityFor = (user: AbilityUser): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  const uid = String(user._id);

  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      can('manage', 'all');
      break;

    case ROLES.ADMIN:
      // Shop Admin: full business-object management. Wallets are read-only
      // (money moves only through purchases/withdrawals), withdrawals get
      // the explicit approval workflow verbs.
      can('manage', [
        'User',
        'Shop',
        'Product',
        'Machine',
        'Box',
        'Group',
        'Purchase',
        'Option',
        'Event',
        'Gift',
        'Conversation',
        'Message',
        'Content',
        'Doc',
        'PaymentProvider',
      ]);
      can('read', ['Wallet', 'Transaction', 'Withdrawal']);
      can(['create', 'approve', 'reject', 'pay'], 'Withdrawal');
      // Roles page is visible to admins; editing is Super Admin only.
      can('read', 'Role');
      break;

    case ROLES.VENDOR:
      // Supplier: manages own products/machines, sees own money, asks for
      // withdrawals. Boxes/groups are managed via staff flows (machine
      // ownership is enforced by the machine-scoped repos).
      can('read', CATALOG_SUBJECTS);
      can('read', ['Doc', 'PaymentProvider']);
      can('create', 'Product');
      can(['update', 'delete'], 'Product', { vendorId: uid });
      // Machines are provisioned by admins; suppliers only service their own.
      can('update', 'Machine', { vendorId: uid });
      can('manage', ['Box', 'Group']);
      can('read', ['Purchase', 'Wallet', 'Transaction'], { vendorId: uid });
      // Purchases on their machines can be adjusted by the supplier…
      can(['update', 'delete'], 'Purchase', { vendorId: uid });
      // …and suppliers can also buy from machines like any shopper.
      can(['create', 'read'], 'Purchase', { customerId: uid });
      can(['read', 'create'], 'Withdrawal', { vendorId: uid });
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      break;

    case ROLES.CUSTOMER:
    case 'Guest':
      can('read', CATALOG_SUBJECTS);
      // Shoppers own their cart end-to-end (guests included).
      can(['create', 'read', 'update', 'delete'], 'Purchase', { customerId: uid });
      can(['create', 'read'], 'Gift');
      can(['read', 'create', 'update'], ['Conversation', 'Message']);
      can(['read', 'update', 'delete'], 'User', { _id: uid });
      break;

    default: {
      // Custom role from the registry; unknown roles get no permissions.
      const rows = customRoles.get(user.role);
      if (rows) {
        for (const row of rows) {
          const condition = SCOPE_CONDITIONS[row.scope];
          if (condition) {
            can(row.action, row.subject, condition(uid));
          } else {
            can(row.action, row.subject);
          }
        }
      }
      break;
    }
  }

  return build();
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
