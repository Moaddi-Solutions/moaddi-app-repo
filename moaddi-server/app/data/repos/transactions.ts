import moment = require('moment');
import shortId = require('shortid');
import type { ClientSession, Model } from 'mongoose';
import type ModelTypes = require('../models/types');
import { repoError } from '../../lib/errors';
import * as money from '../../lib/money';

const Transactions = require('../models/transactions') as Model<ModelTypes.ITransaction>;
const Purchases = require('../models/purchases') as Model<ModelTypes.IPurchase>;
const Products = require('../models/products') as Model<ModelTypes.IProduct>;
const Machines = require('../models/machines') as Model<ModelTypes.IMachine>;
const config: { timeDifference: number } = require('../../../config');

interface EnrichTransactionsOpts {
  /**
   * When set (e.g. vendor viewing own ledger), only include purchase line items
   * attributed to this vendor. Admins should omit so all lines are visible.
   */
  scopeVendorId?: string | null;
}

const now = () => moment().utc().add(config.timeDifference, 'hours').toDate();

interface CreateInput {
  walletId: string;
  vendorId: string;
  type: ModelTypes.TransactionType;
  kind: ModelTypes.TransactionKind;
  amount: number;
  currency: string;
  balanceAfter: number;
  purchaseId?: string | null;
  withdrawalId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a transaction. For `kind: "purchase"` the unique index on
 * (purchaseId, vendorId, kind) makes this idempotent — if a row already
 * exists, returns it instead of throwing.
 */
const create = async (
  input: CreateInput,
  session?: ClientSession
): Promise<ModelTypes.ITransaction> => {
  const doc = new Transactions({
    _id: 'txn_' + shortId.generate(),
    walletId: input.walletId,
    vendorId: input.vendorId,
    type: input.type,
    kind: input.kind,
    amount: money.fromNumber(input.amount),
    currency: input.currency,
    balanceAfter: money.fromNumber(input.balanceAfter),
    purchaseId: input.purchaseId ?? null,
    withdrawalId: input.withdrawalId ?? null,
    description: input.description,
    metadata: input.metadata,
    created: now(),
  });
  try {
    await doc.save({ session });
    return doc.toJSON() as ModelTypes.ITransaction;
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e && e.code === 11000 && input.kind === 'purchase' && input.purchaseId) {
      const existing = await Transactions.findOne({
        purchaseId: input.purchaseId,
        vendorId: input.vendorId,
        kind: 'purchase',
      }).session(session ?? null);
      if (existing) return existing.toJSON() as ModelTypes.ITransaction;
    }
    throw err;
  }
};

/**
 * Load purchases + product/machine labels for transaction responses.
 * Vendors only see line items for their own machines/products on that purchase.
 */
const enrichWithPurchaseSummaries = async (
  rows: ModelTypes.ITransaction[],
  opts: EnrichTransactionsOpts = {}
): Promise<ModelTypes.ITransaction[]> => {
  const scopeVendorId =
    opts.scopeVendorId != null && String(opts.scopeVendorId).trim() !== ''
      ? String(opts.scopeVendorId).trim()
      : null;

  const purchaseIds = [
    ...new Set(
      rows
        .map((r) => (r.purchaseId != null ? String(r.purchaseId).trim() : ''))
        .filter((id) => id !== '')
    ),
  ];
  if (purchaseIds.length === 0) {
    return rows.map((r) => ({ ...r }));
  }

  const purchaseDocs = await Purchases.find({ _id: { $in: purchaseIds } });
  const purchaseById = new Map<string, ModelTypes.IPurchase>();
  const productIds = new Set<string>();
  const machineIds = new Set<string>();

  for (const doc of purchaseDocs) {
    const p = doc.toJSON() as ModelTypes.IPurchase;
    purchaseById.set(String(p._id), p);
    for (const it of p.items || []) {
      productIds.add(String(it.productId));
      if (it.machineId) machineIds.add(String(it.machineId));
    }
    if (p.machineId) machineIds.add(String(p.machineId));
  }

  const [productsArr, machinesArr] = await Promise.all([
    productIds.size ? Products.find({ _id: { $in: [...productIds] } }) : [],
    machineIds.size ? Machines.find({ _id: { $in: [...machineIds] } }) : [],
  ]);

  const productById = new Map(
    productsArr.map((d) => {
      const x = d.toJSON() as ModelTypes.IProduct;
      return [String(x._id), x] as const;
    })
  );
  const machineById = new Map(
    machinesArr.map((d) => {
      const x = d.toJSON() as ModelTypes.IMachine;
      return [String(x._id), x] as const;
    })
  );

  const lineVendorId = (
    item: ModelTypes.IPurchaseItem,
    purchase: ModelTypes.IPurchase
  ): string | null => {
    const mid = item.machineId || purchase.machineId;
    const machine = mid ? machineById.get(String(mid)) : undefined;
    const product = productById.get(String(item.productId));
    const v = (machine?.vendorId ?? product?.vendorId) ?? null;
    return v != null && String(v).trim() !== '' ? String(v).trim() : null;
  };

  const buildSummary = (
    purchase: ModelTypes.IPurchase
  ): ModelTypes.ITransactionPurchaseSummary => {
    const rawItems = purchase.items || [];
    const lines: ModelTypes.ITransactionPurchaseSummaryItem[] = [];
    for (const it of rawItems) {
      const lv = lineVendorId(it, purchase);
      if (scopeVendorId && lv !== scopeVendorId) continue;
      const product = productById.get(String(it.productId));
      lines.push({
        productId: String(it.productId),
        productName: product?.name ? String(product.name) : String(it.productId),
        machineId: it.machineId,
        boxId: String(it.boxId),
      });
    }
    return {
      _id: String(purchase._id),
      customerId: String(purchase.customerId),
      preferredCurrency: purchase.preferredCurrency,
      price: purchase.price,
      status: purchase.status as string | undefined,
      items: lines,
    };
  };

  return rows.map((tx) => {
    if (tx.purchaseId == null || String(tx.purchaseId).trim() === '') {
      return { ...tx };
    }
    const purchase = purchaseById.get(String(tx.purchaseId));
    if (!purchase) {
      return { ...tx, purchaseSummary: null };
    }
    return { ...tx, purchaseSummary: buildSummary(purchase) };
  });
};

const getById = async (
  id: string,
  enrichOpts: EnrichTransactionsOpts = {}
): Promise<ModelTypes.ITransaction> => {
  const t = await Transactions.findOne({ _id: id });
  if (!t) throw repoError(404, 'Transaction not found.');
  const row = t.toJSON() as ModelTypes.ITransaction;
  const [enriched] = await enrichWithPurchaseSummaries([row], enrichOpts);
  return enriched;
};

interface ListFilter {
  walletId?: string;
  vendorId?: string;
  purchaseId?: string;
  withdrawalId?: string;
  kind?: ModelTypes.TransactionKind;
  type?: ModelTypes.TransactionType;
}

const list = async (
  filter: ListFilter = {},
  skip: number = 0,
  limit: number = 100
): Promise<{ data: ModelTypes.ITransaction[]; total: number }> => {
  const query: Record<string, unknown> = { ...filter };
  const total = await Transactions.countDocuments(query);
  const docs = await Transactions.find(query)
    .sort({ created: -1 })
    .skip(parseInt(String(skip)))
    .limit(parseInt(String(limit)));
  return {
    data: docs.map((d) => d.toJSON() as ModelTypes.ITransaction),
    total,
  };
};

const getByPurchase = async (purchaseId: string): Promise<ModelTypes.ITransaction[]> => {
  const docs = await Transactions.find({ purchaseId }).sort({ created: -1 });
  return docs.map((d) => d.toJSON() as ModelTypes.ITransaction);
};

const getByWithdrawal = async (withdrawalId: string): Promise<ModelTypes.ITransaction | null> => {
  const doc = await Transactions.findOne({ withdrawalId });
  return doc ? (doc.toJSON() as ModelTypes.ITransaction) : null;
};

/** Idempotent purchase credits — used to skip wallet balance on webhook replay. */
const findPurchaseVendorCredit = async (
  purchaseId: string,
  vendorId: string,
  session?: ClientSession
): Promise<ModelTypes.ITransaction | null> => {
  const doc = await Transactions.findOne({
    purchaseId,
    vendorId,
    kind: 'purchase',
  }).session(session ?? null);
  return doc ? (doc.toJSON() as ModelTypes.ITransaction) : null;
};

export = {
  create,
  getById,
  list,
  enrichWithPurchaseSummaries,
  getByPurchase,
  getByWithdrawal,
  findPurchaseVendorCredit,
};
