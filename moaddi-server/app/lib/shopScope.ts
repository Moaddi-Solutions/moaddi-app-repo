import Users = require('../data/models/users');
import Machines = require('../data/models/machines');
import Shops = require('../data/models/shops');
import * as money from './money';

/**
 * Resolvers for the denormalized `shopId` column that Shop Admin authorization
 * reads (see `ability.ts`). Records are stamped at creation from whichever
 * parent owns them — the vendor for catalog/money rows, the machine for boxes,
 * events and orders — and re-stamped by the `reshop`/`remachine` helpers when
 * that parent moves.
 *
 * Kept here rather than in a repo so any repo can call it without pulling in a
 * sibling repo and risking a require cycle.
 */

/** The shop a staff user belongs to, or null when unassigned. */
export const shopIdOfUser = async (
  userId: string | null | undefined
): Promise<string | null> => {
  if (!userId) return null;
  const user = await Users.findOne({ _id: String(userId) })
    .select('shopId')
    .lean();
  const shopId = (user as { shopId?: string | null } | null)?.shopId;
  return shopId ? String(shopId) : null;
};

/** The shop and vendor a machine belongs to, plus assigned suppliers. */
export const ownersOfMachine = async (
  machineId: string | null | undefined
): Promise<{
  shopId: string | null;
  vendorId: string | null;
  supplierIds: string[];
}> => {
  if (!machineId) return { shopId: null, vendorId: null, supplierIds: [] };
  const machine = await Machines.findOne({ _id: String(machineId) })
    .select('shopId vendorId supplierIds')
    .lean();
  const doc = machine as {
    shopId?: string | null;
    vendorId?: string | null;
    supplierIds?: string[] | null;
  } | null;
  return {
    shopId: doc?.shopId ? String(doc.shopId) : null,
    vendorId: doc?.vendorId ? String(doc.vendorId) : null,
    supplierIds: Array.isArray(doc?.supplierIds)
      ? doc!.supplierIds!.map(String)
      : [],
  };
};

/** The shop a machine belongs to, or null. */
export const shopIdOfMachine = async (
  machineId: string | null | undefined
): Promise<string | null> => (await ownersOfMachine(machineId)).shopId;

/**
 * Shop Owner cut for a machine: machine override → shop default → 0.
 * Clamped to [0, 100]. Used by purchase crediting and revenue reports.
 */
export const effectiveCommissionPercent = async (
  machineId: string | null | undefined
): Promise<number> => {
  if (!machineId) return 0;
  const machine = await Machines.findOne({ _id: String(machineId) })
    .select('shopId commissionPercent')
    .lean();
  const m = machine as {
    shopId?: string | null;
    commissionPercent?: unknown;
  } | null;
  if (!m) return 0;

  if (m.commissionPercent != null && m.commissionPercent !== '') {
    const n = money.toNumber(m.commissionPercent as never);
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
  }

  if (!m.shopId) return 0;
  const shop = await Shops.findOne({ _id: String(m.shopId) })
    .select('defaultCommissionPercent')
    .lean();
  const s = shop as { defaultCommissionPercent?: unknown } | null;
  if (s?.defaultCommissionPercent == null || s.defaultCommissionPercent === '') {
    return 0;
  }
  const n = money.toNumber(s.defaultCommissionPercent as never);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};
