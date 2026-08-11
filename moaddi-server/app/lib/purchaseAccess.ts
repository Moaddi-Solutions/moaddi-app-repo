/**
 * Centralised rules for "who can see / change a purchase" and
 * "who can approve or reject in completePayment" (Admin, scoped Vendor, customer owner).
 * Used by the purchases controller and the payment orchestrator to stay consistent.
 */

import type { IMachine, IPurchase } from '../data/models/types';
import { defineAbilityFor, subject, type Action } from './ability';

export interface AuthUser {
  _id: string;
  role: string;
  /** Shop scope, present on `req.authenticatedUser` (passport loads the full user). */
  shopId?: string | null;
  ownedShopIds?: string[] | null;
}

export interface MachinesRepoForAccess {
  getById: (
    id: string,
    populate: boolean,
    lean: boolean
  ) => Promise<IMachine | null>;
}

type HttpError = Error & { statusCode: number };

const withStatusCode = (message: string, statusCode: number): HttpError => {
  const e = new Error(message) as HttpError;
  e.statusCode = statusCode;
  return e;
};

const forbidden = (): HttpError => withStatusCode('Forbidden', 403);

const needAuth = (): HttpError => withStatusCode('Authentication required', 401);

type PurchaseForMachineIds = Pick<IPurchase, 'machineId' | 'items'>;

/** DB / seeds may use `admin` or `Admin` — compare case-insensitively. */
export const normRole = (role: string | undefined | null): string =>
  String(role ?? '').trim().toLowerCase();

export const isStaffAdminRole = (role: string | undefined | null): boolean => {
  const r = normRole(role);
  return r === 'admin' || r === 'superadmin';
};

// Guests own their purchases exactly like customers do (view/mutate their own only).
const isCustomerRole = (role: string | undefined | null): boolean => {
  const r = normRole(role);
  return r === 'customer' || r === 'guest';
};

export const isVendorRole = (role: string | undefined | null): boolean =>
  normRole(role) === 'vendor';

/**
 * Does this staff user's CASL scope cover this particular order?
 *
 * A Shop Admin's grant is `manage Purchase {shopId: {$in: myShops}}`, so it only
 * resolves against the order's denormalized `shopId` — being an admin is not by
 * itself an answer. Super Admin (`manage all`) passes unconditionally, which is
 * what makes this a safe replacement for the old `isStaffAdminRole` shortcut.
 *
 * Orders created before the shop-scope rollout carry no `shopId`; those stay
 * Super-Admin-only until the backfill stamps them.
 */
export const staffScopeCoversPurchase = (
  purchase: Pick<IPurchase, '_id' | 'customerId' | 'shopId' | 'vendorId'>,
  u: AuthUser,
  action: Action = 'read'
): boolean =>
  defineAbilityFor(u).can(
    action,
    subject('Purchase', {
      _id: String(purchase._id ?? ''),
      customerId: purchase.customerId ?? null,
      shopId: purchase.shopId ?? null,
      vendorId: purchase.vendorId ?? null,
    })
  );

const sameCustomerId = (a: unknown, b: unknown): boolean =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * Unique machine ids referenced by a purchase (top-level `machineId` and per-line `item.machineId`).
 */
export const collectMachineIds = (purchase: PurchaseForMachineIds): string[] => {
  const s = new Set<string>();
  if (purchase.machineId) s.add(purchase.machineId);
  (purchase.items || []).forEach((item) => {
    if (item.machineId) s.add(item.machineId);
  });
  return Array.from(s);
};

export const vendorOwnsAllMachines = async (
  purchase: Pick<IPurchase, 'machineId' | 'items'>,
  vendorId: string,
  machinesRepo: MachinesRepoForAccess
): Promise<boolean> => {
  const ids = collectMachineIds(purchase);
  if (ids.length === 0) {
    return false;
  }
  for (const mid of ids) {
    const m = await machinesRepo.getById(mid, false, false);
    if (!m || m.vendorId != vendorId) {
      return false;
    }
  }
  return true;
};

/**
 * Gift-a-purchase: the buyer OR anyone recorded in `gift.authorizedOpeners`
 * (recipients who claimed the share link) may open the box. Used by the socket
 * control handlers in `events.js`.
 */
export const isAuthorizedOpener = (
  purchase: Pick<IPurchase, 'customerId' | 'gift'>,
  userId: string
): boolean => {
  if (sameCustomerId(purchase.customerId, userId)) return true;
  const openers = purchase.gift?.authorizedOpeners ?? [];
  return openers.some((id) => sameCustomerId(id, userId));
};

/**
 * For GET/PUT/DELETE/invoice: a staff user whose shop scope covers the order,
 * the owning customer, or a Vendor owning all involved machines.
 *
 * The vendor branch stays a live per-machine check rather than the order's
 * denormalized `vendorId`: a purchase may span several machines, and a supplier
 * must own every one of them to touch it.
 */
export const canViewOrMutatePurchase = async (
  purchase: IPurchase,
  u: AuthUser,
  machinesRepo: MachinesRepoForAccess,
  action: Action = 'read'
): Promise<boolean> => {
  if (isStaffAdminRole(u.role)) {
    return staffScopeCoversPurchase(purchase, u, action);
  }
  if (isCustomerRole(u.role) && sameCustomerId(purchase.customerId, u._id))
    return true;
  if (isVendorRole(u.role)) {
    return vendorOwnsAllMachines(purchase, u._id, machinesRepo);
  }
  return false;
};

/**
 * For read-only GET routes: everyone allowed by `canViewOrMutatePurchase`, PLUS
 * gift recipients who claimed the share link. Mutate/delete keep the stricter
 * `canViewOrMutatePurchase` — a recipient never deletes the buyer's purchase.
 */
export const canViewPurchase = async (
  purchase: IPurchase,
  u: AuthUser,
  machinesRepo: MachinesRepoForAccess
): Promise<boolean> => {
  if (isAuthorizedOpener(purchase, u._id)) return true;
  return canViewOrMutatePurchase(purchase, u, machinesRepo);
};

/**
 * For POST /purchases/complete: staff whose shop scope covers the order, Vendor
 * (must own all machines), or Customer (only the purchase owner — e.g. MyFatora
 * redirect callback).
 * Call after loading `purchase` from the DB. Throws with `err.statusCode` 401/403.
 */
export const assertCanUseComplete = async (
  purchase: IPurchase,
  auth: AuthUser | undefined,
  machinesRepo: MachinesRepoForAccess
): Promise<void> => {
  if (auth == null) {
    throw needAuth();
  }
  if (isStaffAdminRole(auth.role)) {
    // Settling a payment changes the order, so this asks for `update`, not `read`.
    if (staffScopeCoversPurchase(purchase, auth, 'update')) {
      return;
    }
    throw forbidden();
  }
  if (isCustomerRole(auth.role)) {
    if (sameCustomerId(purchase.customerId, auth._id)) {
      return;
    }
    throw forbidden();
  }
  if (isVendorRole(auth.role)) {
    const ok = await vendorOwnsAllMachines(purchase, auth._id, machinesRepo);
    if (!ok) {
      throw forbidden();
    }
    return;
  }
  throw forbidden();
};
