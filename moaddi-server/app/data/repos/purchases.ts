import moment = require("moment");
import shortId = require("shortid");
import crypto = require("crypto");
import mongoose = require("mongoose");
import type { ClientSession, Model } from "mongoose";
import type ModelTypes = require("../models/types");
import { repoError } from "../../lib/errors";
import * as money from "../../lib/money";
const Purchases = require("../models/purchases") as Model<ModelTypes.IPurchase>;
const productsRepo = require("./products") as {
  flattenProductForPreferredCurrency: (
    product: ModelTypes.IProduct,
    preferredCurrency: string,
  ) => Record<string, unknown>;
};
const Products = require("../models/products") as Model<ModelTypes.IProduct>;
const Boxes = require("../models/boxes") as Model<ModelTypes.IBox>;
const Users = require("../models/users") as Model<ModelTypes.IUser>;
const Machines = require("../models/machines") as Model<ModelTypes.IMachine>;
const boxesRepo = require("./boxes") as {
  getById: (
    id: string,
    preferredCurrency?: string,
  ) => Promise<ModelTypes.IBox>;
};
const machinesRepo = require("./machines") as {
  getById: (
    id: string,
    populate?: boolean,
    lean?: boolean,
  ) => Promise<ModelTypes.IMachine | null>;
};
const config: { timeDifference: number } = require("../../../config");

const { PURCHASE_STATUS, PAYMENT_PROVIDER } =
  require("../../payment/constants") as {
    PURCHASE_STATUS: Record<string, string>;
    PAYMENT_PROVIDER: Record<string, string>;
  };
const { isStaffAdminRole, isVendorRole } = require("../../lib/purchaseAccess") as {
  isStaffAdminRole: (role: string | null | undefined) => boolean;
  isVendorRole: (role: string | null | undefined) => boolean;
};

const now = () => moment().utc().add(config.timeDifference, "hours").toDate();

/**
 * Combine the caller's requested filters with the CASL row scope.
 *
 * `$and` rather than a merge: a scope may be `{$or: [...]}` (a supplier sees
 * both their sales and their own orders) and a requested filter may carry the
 * same keys, so merging would let one silently overwrite the other.
 */
const scopedMatch = (
  requested: Record<string, unknown>,
  scope: Record<string, unknown>,
): Record<string, unknown> => {
  if (Object.keys(scope).length === 0) return requested;
  if (Object.keys(requested).length === 0) return scope;
  return { $and: [scope, requested] };
};

const normCurrency = (c: unknown): string =>
  String(c ?? "")
    .trim()
    .toUpperCase();

/** Unit price (campaign if set, else sale) in `checkoutCurrency`, same rules as catalog `preferredCurrency`. */
const unitPriceInCheckoutCurrency = (
  product: ModelTypes.IProduct,
  checkoutCurrency: string,
): number => {
  const flat = productsRepo.flattenProductForPreferredCurrency(
    product,
    normCurrency(checkoutCurrency) || "SAR",
  );
  const sale = Number(flat.salePrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const campRaw = flat.campaignPrice;
  const camp =
    campRaw != null && campRaw !== "" ? Number(campRaw) : Number.NaN;
  return Number.isFinite(camp) ? camp : saleOk;
};

/** Flatten joined product docs for purchase detail APIs (invoice, admin show). */
const shapePurchaseProductsForApi = (
  purchase: Record<string, unknown>,
): void => {
  const raw = purchase.products;
  if (!Array.isArray(raw) || raw.length === 0) return;
  const pref =
    normCurrency((purchase.preferredCurrency as string) ?? "") || "SAR";
  purchase.products = raw.map((p) =>
    productsRepo.flattenProductForPreferredCurrency(
      p as ModelTypes.IProduct,
      pref,
    ),
  );
};

/** Mongo filter: purchase still open for payment (matches `isAwaitingPayment` in payment/constants). */
const matchAwaitingPayment = (): Record<string, unknown> => ({
  $or: [
    { status: { $exists: false } },
    { status: null },
    { status: PURCHASE_STATUS.PAYMENT_DONE_REQUEST },
  ],
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface GroupedItem extends ModelTypes.IPurchaseItem {
  amount: number;
}

const calculatePrice = async (
  items: ModelTypes.IPurchaseItem[],
  checkoutCurrency: string,
): Promise<number> => {
  const pref = normCurrency(checkoutCurrency) || "SAR";
  let price = 0;
  const grouped = items.reduce<Record<string, GroupedItem>>((prev, curr) => {
    const existing = prev[curr.productId];
    prev[curr.productId] = existing
      ? { ...existing, amount: existing.amount + 1 }
      : { ...curr, amount: 1 };
    return prev;
  }, {});
  const products = await Products.find({ _id: { $in: Object.keys(grouped) } });
  for (const id of Object.keys(grouped)) {
    const product = products.find((p) => String(p._id) === String(id));
    if (!product) {
      throw repoError(400, `Product not found: ${id}`);
    }
    price += unitPriceInCheckoutCurrency(product, pref) * grouped[id].amount;
  }
  return price;
};

// ---------------------------------------------------------------------------
// create — atomic via session when supported
// ---------------------------------------------------------------------------

const isNoTxnSupportError = (err: unknown): boolean => {
  const e = err as { codeName?: string; code?: number; message?: string };
  return (
    e?.codeName === "IllegalOperation" ||
    e?.code === 20 ||
    /Transaction numbers are only allowed/.test(e?.message ?? "")
  );
};

const create = async (
  purchaseInput: Partial<ModelTypes.IPurchase> & {
    machine?: ModelTypes.IMachine;
    customerId: string;
  },
): Promise<unknown> => {
  const usersRepo = require("./users") as {
    checkUser: (id: string) => Promise<ModelTypes.IUser>;
  };
  const socketServer = require("../../services/socket") as {
    socketPublish: (msg: { type: string; data: unknown }) => Promise<unknown>;
  };

  const machine = purchaseInput.machine;
  const { machine: _drop, ...purchaseRest } = purchaseInput;

  const purchase = new Purchases(purchaseRest);
  purchase._id = "purchase_" + shortId.generate();
  purchase.status = PURCHASE_STATUS.PAYMENT_DONE_REQUEST;
  purchase.created = now();

  const customer = await usersRepo.checkUser(purchaseInput.customerId);
  const preferredExplicit = (
    purchaseInput as { preferredCurrency?: string }
  ).preferredCurrency;
  const checkoutCurrency =
    normCurrency(preferredExplicit || customer.preferredCurrency) || "SAR";
  (purchase as unknown as Record<string, unknown>).preferredCurrency =
    checkoutCurrency;
  purchase.price = await calculatePrice(purchase.items, checkoutCurrency);

  const optionsRepo = require("./options") as {
    getActivePaymentProviders: () => Promise<string[]>;
  };
  let dbMachine: ModelTypes.IMachine | null = null;
  if (purchase.machineId) {
    dbMachine = await machinesRepo.getById(String(purchase.machineId), false, false);
    // Stamp the shop and supplier this order happened under. Historical on
    // purpose — neither must follow the machine if it is later moved to another
    // shop or reassigned. These two columns are what the CASL Purchase rules
    // (`{shopId: {$in: myShops}}` / `{vendorId: me}`) resolve against, so an
    // order with neither is visible to the Super Admin and its buyer only.
    const owners = dbMachine as { shopId?: string | null; vendorId?: string | null } | null;
    (purchase as unknown as Record<string, unknown>).shopId = owners?.shopId ?? null;
    (purchase as unknown as Record<string, unknown>).vendorId = owners?.vendorId ?? null;
  }
  const bodyProvider = (
    purchaseInput as { paymentProvider?: string | null }
  ).paymentProvider;
  const rawCandidate =
    bodyProvider != null && String(bodyProvider).trim() !== ""
      ? String(bodyProvider).trim()
      : machine?.paymentProvider != null &&
          String(machine.paymentProvider).trim() !== ""
        ? String(machine.paymentProvider).trim()
        : dbMachine?.paymentProvider != null &&
            String(dbMachine.paymentProvider).trim() !== ""
          ? String(dbMachine.paymentProvider).trim()
          : null;
  const candidate = rawCandidate ? rawCandidate.toLowerCase() : null;
  const allowedOnPurchase = new Set<string>([
    PAYMENT_PROVIDER.MYFATOORA,
    PAYMENT_PROVIDER.STRIPE,
    PAYMENT_PROVIDER.MOYASAR,
  ]);
  if (candidate) {
    if (!allowedOnPurchase.has(candidate)) {
      throw repoError(400, `Invalid payment provider for purchases: ${candidate}`);
    }
    const active = await optionsRepo.getActivePaymentProviders();
    if (!active.includes(candidate)) {
      throw repoError(
        400,
        `Payment provider "${candidate}" is not active. Activate it under Site Options first.`,
      );
    }
    purchase.paymentProvider = candidate as ModelTypes.IPurchase["paymentProvider"];
  }

  /** Boxes stay available until payment succeeds; see `deactivateBoxesForPaidPurchase`. */
  const session = await mongoose.startSession();
  let saved: ModelTypes.IPurchase;

  try {
    await session.withTransaction(async () => {
      await purchase.save({ session });
    });
    saved = purchase.toJSON() as ModelTypes.IPurchase;
  } catch (err) {
    if (isNoTxnSupportError(err)) {
      console.warn("[purchases.create] running without transaction support");
      await purchase.save();
      saved = purchase.toJSON() as ModelTypes.IPurchase;
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  const response = {
    _id: saved._id,
    customerId: saved.customerId,
    customerName: customer.name,
    machineId: saved.machineId,
    machineName: machine?.name,
    machine,
    price: saved.price,
    status: saved.status,
    paymentProvider: saved.paymentProvider,
  };
  await socketServer.socketPublish({ type: "PaymentRequests", data: response });
  return response;
};

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

const getById = async (purchaseId: string): Promise<ModelTypes.IPurchase> => {
  const purchase = await Purchases.findOne({ _id: purchaseId });
  if (!purchase) throw repoError(404, "Purchase not found.");
  return purchase.toJSON() as ModelTypes.IPurchase;
};

// ---------------------------------------------------------------------------
// setProviderFields
// ---------------------------------------------------------------------------

const setProviderFields = async (
  purchaseId: string,
  properties: Record<string, unknown>,
  options: { requiredStatus?: string | null } = {},
): Promise<ModelTypes.IPurchase> => {
  const requiredStatus =
    options.requiredStatus === undefined
      ? PURCHASE_STATUS.PAYMENT_DONE_REQUEST
      : options.requiredStatus;
  const filter: Record<string, unknown> = { _id: purchaseId };
  if (requiredStatus != null) filter.status = requiredStatus;

  const r = await Purchases.updateOne(filter, {
    $set: { ...properties, updated: now() },
  });
  if (r.matchedCount === 0) {
    const exists = await Purchases.findOne({ _id: purchaseId });
    if (!exists) throw repoError(404, "Purchase not found.");
    throw repoError(
      409,
      "Purchase is not in a modifiable state for this operation.",
    );
  }
  return getById(purchaseId);
};

// ---------------------------------------------------------------------------
// getByCustomerId
// ---------------------------------------------------------------------------

const getByCustomerId = async (
  customerId: string,
  preferredCurrency?: string,
): Promise<unknown> => {
  const purchase = await Purchases.findOne({
    customerId,
    status: { $ne: PURCHASE_STATUS.COMPLETED },
  }).sort({ created: -1 });
  if (!purchase) return undefined;
  const machine = purchase.machineId
    ? await machinesRepo.getById(purchase.machineId, false)
    : null;
  const boxes = await Promise.all(
    purchase.items.map(async (item) => {
      const box = await boxesRepo.getById(item.boxId, preferredCurrency);
      (box as unknown as Record<string, unknown>).boxStatus = item.boxStatus;
      return box;
    }),
  );

  return {
    ...purchase.toObject(),
    machineId: purchase.machineId,
    machine,
    boxes,
    status: purchase.status,
  };
};

// ---------------------------------------------------------------------------
// getByInvoiceId — accepts numeric (My Fatoora) or string (Stripe pi_…)
// ---------------------------------------------------------------------------

const getByInvoiceId = async (invoiceId: string): Promise<unknown> => {
  const ors: Record<string, unknown>[] = [{ invoiceId }];
  const asInt = parseInt(String(invoiceId), 10);
  if (Number.isFinite(asInt)) ors.push({ invoiceId: asInt });

  const pipeline = [
    { $match: { $or: ors } },
    {
      $lookup: {
        from: "products",
        foreignField: "_id",
        localField: "items.productId",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "machines",
        foreignField: "_id",
        localField: "machineId",
        as: "machine",
      },
    },
    {
      $lookup: {
        from: "shops",
        foreignField: "_id",
        localField: "machine.shopId",
        as: "shop",
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "customerId",
        as: "customer",
      },
    },
  ];
  const purchase = (await Purchases.aggregate(pipeline as never[]).exec())[0];
  if (!purchase) throw repoError(404, "Purchase not found.");

  const boxes = await Promise.all(
    purchase.items.map(async (item: ModelTypes.IPurchaseItem) => {
      const box = await boxesRepo.getById(item.boxId);
      (box as unknown as Record<string, unknown>).boxStatus = item.boxStatus;
      return box;
    }),
  );
  const result = { ...purchase, boxes };
  shapePurchaseProductsForApi(result);
  return result;
};

// ---------------------------------------------------------------------------
// getByIdExpanded — single purchase by _id with products/machine/shop/customer
// (admin payment & invoice detail views)
// ---------------------------------------------------------------------------

const getByIdExpanded = async (purchaseId: string): Promise<unknown> => {
  const pipeline = [
    { $match: { _id: String(purchaseId) } },
    {
      $lookup: {
        from: "products",
        foreignField: "_id",
        localField: "items.productId",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "machines",
        foreignField: "_id",
        localField: "machineId",
        as: "machine",
      },
    },
    {
      $lookup: {
        from: "shops",
        foreignField: "_id",
        localField: "machine.shopId",
        as: "shop",
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "customerId",
        as: "customer",
      },
    },
  ];
  const purchase = (await Purchases.aggregate(pipeline as never[]).exec())[0];
  if (!purchase) throw repoError(404, "Purchase not found.");
  shapePurchaseProductsForApi(purchase);
  return purchase;
};

// ---------------------------------------------------------------------------
// getPendingRequests
// ---------------------------------------------------------------------------

/** After $lookup, `machine` is an array; `purchasesExpand` may set a single machine doc. */
const machineTypeFromRow = (row: {
  machine?: ModelTypes.IMachine | ModelTypes.IMachine[];
}): number | undefined => {
  const m = row.machine;
  if (m == null) return undefined;
  if (Array.isArray(m)) return m[0]?.type as number | undefined;
  return m.type as number | undefined;
};

interface AuthLike {
  role: string;
  _id: string;
}

const PENDING_LIST_MAX = 10_000;

const getPendingRequests = async (
  skip: number = 0,
  limit: number = 1000,
  auth: AuthLike,
  /** CASL row scope; keeps a Shop Admin's queue to orders placed in their shops. */
  scope: Record<string, unknown> = {},
): Promise<{ data: unknown[]; total: number }> => {
  const { role, _id } = auth;

  if (isStaffAdminRole(role)) {
    const filter = scopedMatch(
      {
        status: {
          $in: [PURCHASE_STATUS.PAYMENT_DONE, PURCHASE_STATUS.PROCESSING],
        },
      },
      scope,
    );
    const pipeline = [
      { $match: filter },
      { $sort: { created: -1 } },
      { $limit: PENDING_LIST_MAX },
      {
        $lookup: {
          from: "boxes",
          foreignField: "_id",
          localField: "items.boxId",
          as: "boxes",
        },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "items.productId",
          as: "products",
        },
      },
      {
        $lookup: {
          from: "machines",
          foreignField: "_id",
          localField: "machineId",
          as: "machine",
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "customerId",
          as: "customer",
        },
      },
    ];
    let data = await Purchases.aggregate(pipeline as never[]).exec();
    data = (await purchasesExpand(data as AggregatedPurchase[])).filter(
      (row) => machineTypeFromRow(row) === 0,
    );
    const total = data.length;
    const s = Math.max(0, parseInt(String(skip), 10) || 0);
    const lim = Math.min(
      1000,
      Math.max(1, parseInt(String(limit), 10) || 1000),
    );
    return { data: data.slice(s, s + lim), total };
  }

  if (isVendorRole(role)) {
    // Real total: purchases on machines owned by this vendor, in active states.
    const vendorMachines = await Machines.find({ vendorId: _id }, { _id: 1 });
    const machineIds = vendorMachines.map((m) => m._id);
    const total = await Purchases.countDocuments({
      machineId: { $in: machineIds },
      status: {
        $in: [PURCHASE_STATUS.PAYMENT_DONE, PURCHASE_STATUS.PROCESSING],
      },
    });

    const pipeline = [
      { $match: { _id } },
      {
        $lookup: {
          from: "machines",
          foreignField: "vendorId",
          localField: "_id",
          as: "machines",
        },
      },
      {
        $lookup: {
          from: "purchases",
          foreignField: "machineId",
          localField: "machines._id",
          as: "purchases",
          pipeline: [
            {
              $match: {
                status: {
                  $in: [
                    PURCHASE_STATUS.PAYMENT_DONE,
                    PURCHASE_STATUS.PROCESSING,
                  ],
                },
              },
            },
            { $sort: { created: -1 } },
            { $skip: parseInt(String(skip)) },
            { $limit: parseInt(String(limit)) },
            {
              $lookup: {
                from: "boxes",
                foreignField: "_id",
                localField: "items.boxId",
                as: "boxes",
              },
            },
            {
              $lookup: {
                from: "products",
                foreignField: "_id",
                localField: "items.productId",
                as: "products",
              },
            },
            {
              $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "customerId",
                as: "customer",
              },
            },
          ],
        },
      },
      { $match: { "machines.type": 0 } },
    ];
    const result = await Users.aggregate(pipeline as never[]).exec();
    const row = result[0];
    if (!row || !row.purchases) return { data: [], total: 0 };
    return { data: row.purchases, total };
  }

  return { data: [], total: 0 };
};

// ---------------------------------------------------------------------------
// purchasesExpand
// ---------------------------------------------------------------------------

interface AggregatedPurchase {
  machineId?: string;
  items: ModelTypes.IPurchaseItem[];
  products: ModelTypes.IProduct[];
  machine?: ModelTypes.IMachine;
}

const purchasesExpand = async (
  purchases: AggregatedPurchase[],
): Promise<AggregatedPurchase[]> => {
  const machines: ModelTypes.IMachine[] = [];
  const expanded: AggregatedPurchase[] = [];

  await Promise.all(
    purchases.map(async (purchase) => {
      if (!purchase.machineId) {
        for (const item of purchase.items) {
          if (expanded.find((e) => e.machineId == item.machineId)) return;
          let machine = machines.find((m) => m._id == item.machineId);
          if (!machine) {
            const fetched = await machinesRepo.getById(item.machineId!, false);
            if (!fetched) continue;
            machine = fetched;
            machines.push(machine);
          }
          const newItems = purchase.items.filter(
            (i) => i.machineId == item.machineId,
          );
          const newProducts = purchase.products.filter((p) =>
            newItems.find((i) => i.productId == p._id),
          );
          expanded.push({
            ...purchase,
            machineId: item.machineId!,
            machine,
            items: newItems,
            products: newProducts,
          });
        }
      }
    }),
  );

  return [...purchases.filter((p) => p.machineId), ...expanded];
};

// ---------------------------------------------------------------------------
// customerHistory
// ---------------------------------------------------------------------------

const customerHistory = async (
  customerId: string,
  skip: number = 0,
  limit: number = 100,
  /** CASL-derived scope; `{}` for the Super Admin, the buyer's own history, etc. */
  scope: Record<string, unknown> = {},
): Promise<{ data: unknown[]; total: number }> => {
  const filter = scopedMatch({ customerId }, scope);
  const total = await Purchases.countDocuments(filter);
  const s = Math.max(0, parseInt(String(skip), 10) || 0);
  const lim = Math.min(1000, Math.max(1, parseInt(String(limit), 10) || 100));
  const pipeline = [
    { $match: filter },
    { $sort: { created: -1 } },
    { $skip: s },
    { $limit: lim },
    {
      $lookup: {
        from: "products",
        foreignField: "_id",
        localField: "items.productId",
        as: "products",
      },
    },
  ];
  const data = await Purchases.aggregate(pipeline as never[]).exec();
  return { data, total };
};

// ---------------------------------------------------------------------------
// listAll — admin view of every payment (purchase), newest first
// ---------------------------------------------------------------------------

interface ListAllFilter {
  status?: string;
  paymentProvider?: string;
  customerId?: string;
  hasInvoice?: boolean;
}

const listAll = async (
  filter: ListAllFilter = {},
  skip: number = 0,
  limit: number = 50,
  /**
   * CASL-derived row scope from `accessibleFilter(ability, 'read', 'Purchase')`:
   * `{}` for the Super Admin, `{shopId: {$in: myShops}}` for a Shop Admin,
   * `{$or: [{vendorId: me}, {customerId: me}]}` for a supplier.
   */
  scope: Record<string, unknown> = {},
): Promise<{ data: unknown[]; total: number }> => {
  const requested: Record<string, unknown> = {};
  if (filter.status) requested.status = String(filter.status);
  if (filter.paymentProvider)
    requested.paymentProvider = String(filter.paymentProvider);
  if (filter.customerId) requested.customerId = String(filter.customerId);
  // Invoices view: only purchases that actually carry an invoiceId.
  if (filter.hasInvoice)
    requested.invoiceId = { $exists: true, $nin: [null, ""] };
  const match = scopedMatch(requested, scope);

  const total = await Purchases.countDocuments(match);
  const s = Math.max(0, parseInt(String(skip), 10) || 0);
  const lim = Math.min(1000, Math.max(1, parseInt(String(limit), 10) || 50));
  const pipeline = [
    { $match: match },
    { $sort: { created: -1 } },
    { $skip: s },
    { $limit: lim },
    {
      $lookup: {
        from: "products",
        foreignField: "_id",
        localField: "items.productId",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "customerId",
        as: "customer",
      },
    },
    {
      $lookup: {
        from: "machines",
        foreignField: "_id",
        localField: "machineId",
        as: "machine",
      },
    },
  ];
  const data = await Purchases.aggregate(pipeline as never[]).exec();
  return { data, total };
};

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

const update = async (
  purchaseId: string,
  properties: Partial<ModelTypes.IPurchase>,
): Promise<ModelTypes.IPurchase> => {
  const purchase = await Purchases.findOne({ _id: purchaseId });
  if (!purchase) throw repoError(404, "Purchase not found.");

  /** Do not toggle `isActive` here — boxes deactivate only after successful payment. */

  for (const key of Object.keys(properties) as (keyof ModelTypes.IPurchase)[]) {
    (purchase as unknown as Record<string, unknown>)[key as string] =
      properties[key];
  }
  const checkoutCurrency =
    normCurrency(
      (purchase.toObject() as { preferredCurrency?: string })
        .preferredCurrency,
    ) || "SAR";
  purchase.price = await calculatePrice(purchase.items, checkoutCurrency);
  purchase.updated = now();
  const saved = await purchase.save();
  return saved.toJSON() as ModelTypes.IPurchase;
};

// ---------------------------------------------------------------------------
// Gift a purchase — share link + authorized openers
// ---------------------------------------------------------------------------

/** Statuses in which a box can still be opened (paid, not yet fully collected). */
const GIFT_OPENABLE_STATUSES = [
  PURCHASE_STATUS.PAYMENT_DONE,
  PURCHASE_STATUS.PROCESSING,
];

const generateClaimToken = (): string => crypto.randomBytes(24).toString("hex");

/** Optional link TTL from GIFT_LINK_TTL_HOURS; unset = valid until completion. */
const giftTtlHours = (): number | null => {
  const raw = process.env.GIFT_LINK_TTL_HOURS;
  const n = raw != null && raw !== "" ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Enable gift sharing on a paid purchase. Idempotent: re-enabling returns the
 * same claim token and preserves any recipients who already claimed.
 */
const enableGift = async (
  purchaseId: string,
): Promise<ModelTypes.IPurchase> => {
  const purchase = await Purchases.findOne({ _id: purchaseId });
  if (!purchase) throw repoError(404, "Purchase not found.");
  if (!GIFT_OPENABLE_STATUSES.includes(String(purchase.status))) {
    throw repoError(409, "Purchase must be paid before it can be gifted.");
  }
  const existing = (purchase.get("gift") || {}) as ModelTypes.IGift;
  const claimToken = existing.claimToken || generateClaimToken();
  const ttl = giftTtlHours();
  purchase.set("gift", {
    isGift: true,
    claimToken,
    sharedAt: now(),
    expiresAt: ttl ? moment(now()).add(ttl, "hours").toDate() : undefined,
    authorizedOpeners: existing.authorizedOpeners || [],
    claimedAt: existing.claimedAt,
  });
  purchase.updated = now();
  const saved = await purchase.save();
  return saved.toJSON() as ModelTypes.IPurchase;
};

const getByClaimToken = async (
  claimToken: string,
): Promise<ModelTypes.IPurchase | null> => {
  if (!claimToken) return null;
  const purchase = await Purchases.findOne({ "gift.claimToken": claimToken });
  return purchase ? (purchase.toJSON() as ModelTypes.IPurchase) : null;
};

/** Record a recipient (or the signed-in buyer) as an authorized opener. */
const recordGiftClaim = async (
  purchaseId: string,
  openerId: string,
): Promise<void> => {
  await Purchases.updateOne(
    { _id: purchaseId },
    {
      $addToSet: { "gift.authorizedOpeners": openerId },
      $set: { "gift.claimedAt": now(), updated: now() },
    },
  );
};

/** Machine + boxes + item summary for the recipient's claim screen. */
const giftView = async (
  purchase: ModelTypes.IPurchase,
  preferredCurrency?: string,
): Promise<unknown> => {
  const machine = purchase.machineId
    ? await machinesRepo.getById(purchase.machineId, false)
    : null;
  const boxes = await Promise.all(
    purchase.items.map(async (item) => {
      const box = await boxesRepo.getById(item.boxId, preferredCurrency);
      (box as unknown as Record<string, unknown>).boxStatus = item.boxStatus;
      return box;
    }),
  );
  return {
    _id: purchase._id,
    // Buyer id: clients gate owner-only actions (e.g. the share button) on it.
    customerId: purchase.customerId,
    machineId: purchase.machineId,
    machine,
    boxes,
    items: purchase.items,
    price: purchase.price,
    preferredCurrency: purchase.preferredCurrency,
    status: purchase.status,
  };
};

/** Derived lifecycle of a gifted purchase for the "My Gifts" list. */
const giftStatusOf = (p: {
  status?: string;
  items?: ModelTypes.IPurchaseItem[];
  gift?: ModelTypes.IGift;
}): "pending" | "claimed" | "collected" | "expired" => {
  const items = p.items || [];
  const opened = items.filter((i) => i.boxStatus).length;
  if (
    p.status === PURCHASE_STATUS.COMPLETED ||
    (items.length > 0 && opened === items.length)
  ) {
    return "collected";
  }
  const exp = p.gift?.expiresAt;
  if (exp != null && new Date(exp).getTime() < Date.now()) return "expired";
  if (p.gift?.claimedAt) return "claimed";
  return "pending";
};

interface GiftListDoc {
  _id: string;
  machineId?: string;
  items?: ModelTypes.IPurchaseItem[];
  price?: number;
  preferredCurrency?: string;
  status?: string;
  gift?: ModelTypes.IGift;
  machine?: { name?: string }[];
  products?: { name?: string }[];
  buyer?: { name?: string }[];
}

/** One row of the gifts list. `claimToken` only for the sender's own gifts. */
const shapeGiftListItem = (doc: GiftListDoc, includeToken: boolean) => {
  const items = doc.items || [];
  return {
    _id: doc._id,
    machineId: doc.machineId ?? null,
    machineName: doc.machine?.[0]?.name ?? null,
    productNames: (doc.products || []).map((p) => p.name).filter(Boolean),
    price: doc.price ?? null,
    preferredCurrency: doc.preferredCurrency ?? null,
    status: doc.status,
    boxesTotal: items.length,
    boxesOpened: items.filter((i) => i.boxStatus).length,
    giftStatus: giftStatusOf(doc),
    sharedAt: doc.gift?.sharedAt ?? null,
    claimedAt: doc.gift?.claimedAt ?? null,
    expiresAt: doc.gift?.expiresAt ?? null,
    claimToken: includeToken ? (doc.gift?.claimToken ?? null) : null,
    buyerName: includeToken ? null : (doc.buyer?.[0]?.name ?? null),
  };
};

/**
 * Gifts dashboard: purchases the user shared as a gift (`sent`) and gifts
 * shared with them that they claimed (`received`).
 */
const listGiftsForUser = async (
  userId: string,
): Promise<{ sent: unknown[]; received: unknown[] }> => {
  const shapeStages = [
    { $sort: { "gift.sharedAt": -1 as const, created: -1 as const } },
    { $limit: 100 },
    {
      $lookup: {
        from: "machines",
        localField: "machineId",
        foreignField: "_id",
        as: "machine",
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customerId",
        foreignField: "_id",
        as: "buyer",
      },
    },
  ];
  const [sent, received] = await Promise.all([
    Purchases.aggregate([
      { $match: { customerId: userId, "gift.isGift": true } },
      ...shapeStages,
    ] as never[]).exec(),
    Purchases.aggregate([
      {
        $match: {
          "gift.isGift": true,
          "gift.authorizedOpeners": userId,
          customerId: { $ne: userId },
        },
      },
      ...shapeStages,
    ] as never[]).exec(),
  ]);
  return {
    sent: (sent as GiftListDoc[]).map((d) => shapeGiftListItem(d, true)),
    received: (received as GiftListDoc[]).map((d) =>
      shapeGiftListItem(d, false),
    ),
  };
};

// ---------------------------------------------------------------------------
// Wallet credit pipeline
// ---------------------------------------------------------------------------

interface CreditSummary {
  vendorId: string;
  walletId: string;
  amount: number;
  currency: string;
  transactionId: string;
}

/** Mark purchase line boxes unavailable after payment (idempotent). */
const deactivateBoxesForPaidPurchase = async (
  items: ModelTypes.IPurchaseItem[],
): Promise<void> => {
  const boxIds = items.map((i) => i.boxId).filter(Boolean);
  if (!boxIds.length) return;
  await Boxes.updateMany(
    { _id: { $in: boxIds } },
    { $set: { isActive: false } },
  );
};

/**
 * Group items by their machine's vendor (fallback: product.vendorId), apply
 * the platform fee, credit each vendor's wallet, and write a CREDIT
 * transaction.
 *
 * Uses the same per-line prices as checkout (`unitPriceInCheckoutCurrency` +
 * `purchase.preferredCurrency`), then splits the stored `purchase.price` so
 * vendors always receive a fair share of what was actually charged (minus the
 * platform fee), including when catalog prices change after checkout.
 *
 * Idempotent: skips wallet credit if a purchase CREDIT already exists; the
 * unique index on (purchaseId, vendorId, kind="purchase") still prevents
 * duplicate rows.
 */
const creditVendorsForPurchase = async (
  purchase: ModelTypes.IPurchase,
): Promise<CreditSummary[]> => {
  const walletsRepo = require("./wallets") as typeof import("./wallets");
  const transactionsRepo =
    require("./transactions") as typeof import("./transactions");
  const optionsRepo = require("./options") as typeof import("./options");

  if (!purchase.items || purchase.items.length === 0) return [];

  await deactivateBoxesForPaidPurchase(purchase.items);

  // Resolve productId → product, machineId → machine, then group by vendor.
  const productIds = Array.from(
    new Set(purchase.items.map((i) => i.productId)),
  );
  const machineIds = Array.from(
    new Set(
      purchase.items
        .map((i) => i.machineId || purchase.machineId)
        .filter((id): id is string => !!id),
    ),
  );

  const [productsArr, machinesArr] = await Promise.all([
    Products.find({ _id: { $in: productIds } }),
    Machines.find({ _id: { $in: machineIds } }),
  ]);
  const productById = new Map(productsArr.map((p) => [String(p._id), p]));
  const machineById = new Map(machinesArr.map((m) => [String(m._id), m]));

  const checkoutCur = normCurrency(purchase.preferredCurrency) || "SAR";
  const weightByVendor = new Map<string, number>();
  for (const item of purchase.items) {
    const product = productById.get(String(item.productId));
    if (!product) continue;
    const machineId = item.machineId || purchase.machineId;
    const machine = machineId ? machineById.get(String(machineId)) : undefined;
    const vendorId = (machine?.vendorId ?? product.vendorId) || null;
    if (!vendorId) {
      console.warn(
        `[purchases.credit] item ${item.boxId} has no vendorId — skipping`,
      );
      continue;
    }
    const unit = unitPriceInCheckoutCurrency(product, checkoutCur);
    weightByVendor.set(
      vendorId,
      (weightByVendor.get(vendorId) ?? 0) + unit,
    );
  }

  const vendorEntries = [...weightByVendor.entries()].filter(
    ([, w]) => w > 0,
  );
  if (vendorEntries.length === 0) return [];

  const totalWeight = vendorEntries.reduce((s, [, w]) => s + w, 0);
  if (!(totalWeight > 0)) return [];

  const paidTotal = Number(purchase.price);
  if (!Number.isFinite(paidTotal) || !(paidTotal > 0)) {
    console.warn(
      `[purchases.credit] invalid purchase.price for ${purchase._id} — skipping credits`,
    );
    return [];
  }

  const feePercent = await optionsRepo.getPlatformFeePercent();
  /** Must match checkout: `paidTotal` / splits are in this currency, not platform default (e.g. USD). */
  const walletCurrency = checkoutCur;
  const factor = Math.max(0, 1 - feePercent / 100);
  const netPool = Math.round(paidTotal * factor * 100) / 100;
  if (!(netPool > 0)) return [];

  // Split net pool by checkout-time line weights; last vendor absorbs rounding remainder.
  vendorEntries.sort((a, b) => b[1] - a[1]);
  const vendorAmountById = new Map<string, number>();
  let allocatedSum = 0;
  for (let i = 0; i < vendorEntries.length; i++) {
    const [vendorId, w] = vendorEntries[i];
    const isLast = i === vendorEntries.length - 1;
    if (isLast) {
      vendorAmountById.set(
        vendorId,
        Math.round((netPool - allocatedSum) * 100) / 100,
      );
    } else {
      const part =
        Math.round(((w / totalWeight) * netPool) * 100) / 100;
      vendorAmountById.set(vendorId, part);
      allocatedSum = Math.round((allocatedSum + part) * 100) / 100;
    }
  }

  const summaries: CreditSummary[] = [];

  for (const [vendorId, vendorAmount] of vendorAmountById) {
    if (!(vendorAmount > 0)) continue;

    const session = await mongoose.startSession();
    try {
      let summary: CreditSummary | null = null;
      const run = async (s?: ClientSession) => {
        const existing = await transactionsRepo.findPurchaseVendorCredit(
          purchase._id,
          vendorId,
          s,
        );
        if (existing) {
          summary = {
            vendorId,
            walletId: existing.walletId,
            amount: money.toNumber(existing.amount),
            currency: existing.currency,
            transactionId: existing._id,
          };
          return;
        }

        const wallet = await walletsRepo.getOrCreateForVendor(
          vendorId,
          walletCurrency,
          s,
        );
        const credited = await walletsRepo.creditBalance(
          wallet._id,
          vendorAmount,
          s,
        );
        const txn = await transactionsRepo.create(
          {
            walletId: wallet._id,
            vendorId,
            type: "CREDIT",
            kind: "purchase",
            amount: vendorAmount,
            currency: wallet.currency,
            balanceAfter: money.toNumber(credited.balance),
            purchaseId: purchase._id,
            description: `Purchase ${purchase._id}`,
            metadata: {
              feePercent,
              checkoutCurrency: checkoutCur,
              paidTotal,
              netPool,
            },
          },
          s,
        );
        summary = {
          vendorId,
          walletId: wallet._id,
          amount: vendorAmount,
          currency: wallet.currency,
          transactionId: txn._id,
        };
      };

      try {
        await session.withTransaction(() => run(session));
      } catch (err) {
        if (isNoTxnSupportError(err)) {
          console.warn(
            "[purchases.credit] running without transaction support",
          );
          await run();
        } else {
          throw err;
        }
      }
      if (summary) summaries.push(summary);
    } finally {
      await session.endSession();
    }
  }

  // Best-effort socket fan-out.
  try {
    const socketServer = require("../../services/socket") as {
      socketPublish: (msg: { type: string; data: unknown }) => Promise<unknown>;
    };
    for (const s of summaries) {
      await socketServer.socketPublish({ type: "WalletCredited", data: s });
    }
  } catch (err) {
    console.error("[purchases.credit] socket publish failed", err);
  }

  return summaries;
};

// ---------------------------------------------------------------------------
// Stripe webhook helpers
// ---------------------------------------------------------------------------

interface StripePaymentIntentLike {
  id: string;
  client_secret?: string | null;
  metadata?: { purchaseId?: string };
  /** Smallest currency unit (e.g. halalas for SAR). */
  amount?: number;
}

const expectedStripeAmountMinorUnits = (price: number): number => {
  if (process.env.STRIPE_ZERO_DECIMAL === "1") {
    return Math.round(Number(price));
  }
  return Math.round(Number(price) * 100);
};

const applyStripePaymentIntentSucceeded = async (
  paymentIntent: StripePaymentIntentLike,
): Promise<void> => {
  const id = paymentIntent.id;
  const clientSecret = paymentIntent.client_secret;
  const purchaseId = paymentIntent.metadata?.purchaseId;
  const ors: Record<string, unknown>[] = [{ invoiceId: id }];
  if (clientSecret) ors.push({ invoiceId: clientSecret });
  if (purchaseId) ors.push({ _id: purchaseId });

  const open = await Purchases.findOne({
    $and: [matchAwaitingPayment(), { $or: ors }],
  });
  if (
    open &&
    typeof paymentIntent.amount === "number" &&
    paymentIntent.amount !== expectedStripeAmountMinorUnits(Number(open.price))
  ) {
    console.warn(
      `[stripe] amount mismatch pi=${paymentIntent.amount} expected=${expectedStripeAmountMinorUnits(
        Number(open.price),
      )} purchase=${open._id}`,
    );
    return;
  }

  const r = await Purchases.updateOne(
    { $and: [matchAwaitingPayment(), { $or: ors }] },
    {
      $set: {
        status: PURCHASE_STATUS.PAYMENT_DONE,
        invoiceId: id,
        paymentProvider: PAYMENT_PROVIDER.STRIPE,
        updated: now(),
      },
    },
  );

  if (r.matchedCount === 0) {
    const idempotent = await Purchases.findOne({
      $or: [
        { invoiceId: id },
        ...(clientSecret ? [{ invoiceId: clientSecret }] : []),
      ],
      status: PURCHASE_STATUS.PAYMENT_DONE,
    });
    if (idempotent) {
      // Still safe to credit — transactions table enforces idempotency.
      await creditVendorsForPurchase(
        idempotent.toJSON() as ModelTypes.IPurchase,
      );
      return;
    }
    console.warn(
      `[stripe] payment_intent.succeeded: no matching purchase (open) for ${id} metadata.purchaseId=${
        purchaseId || ""
      }`,
    );
    return;
  }

  const final = await Purchases.findOne({ invoiceId: id });
  if (final)
    await creditVendorsForPurchase(final.toJSON() as ModelTypes.IPurchase);
};

const applyStripePaymentIntentFailed = async (
  paymentIntent: StripePaymentIntentLike,
): Promise<void> => {
  const id = paymentIntent.id;
  const clientSecret = paymentIntent.client_secret;
  const purchaseId = paymentIntent.metadata?.purchaseId;
  const ors: Record<string, unknown>[] = [{ invoiceId: id }];
  if (clientSecret) ors.push({ invoiceId: clientSecret });
  if (purchaseId) ors.push({ _id: purchaseId });

  const p = await Purchases.findOne({
    $and: [matchAwaitingPayment(), { $or: ors }],
  });
  if (p) {
    await remove(p._id);
  } else {
    console.warn(
      `[stripe] payment_intent.payment_failed: no open purchase for PI ${id}`,
    );
  }
};

const tryReserveStripeClientNotification = async (
  purchaseId: string,
  customerId: string,
): Promise<boolean> => {
  const isStripeish = {
    $or: [
      { paymentProvider: PAYMENT_PROVIDER.STRIPE },
      { invoiceId: { $regex: "^pi_" } },
    ],
  };
  const u = await Purchases.updateOne(
    {
      _id: purchaseId,
      customerId,
      status: PURCHASE_STATUS.PAYMENT_DONE,
      $and: [
        isStripeish,
        {
          $or: [
            { stripeNotified: { $ne: true } },
            { stripeNotified: { $exists: false } },
          ],
        },
      ],
    },
    { $set: { stripeNotified: true, updated: now() } },
  );
  return u.modifiedCount === 1;
};

const revertStripeClientNotificationFlag = async (purchaseId: string) => {
  return Purchases.updateOne(
    { _id: purchaseId },
    { $set: { stripeNotified: false, updated: now() } },
  );
};

// ---------------------------------------------------------------------------
// Moyasar — webhook + client finalize (React Native SDK charges on-device)
// ---------------------------------------------------------------------------

const moyasarMinorAmount = (price: number, currency: string): number => {
  const c = String(currency || "SAR").toUpperCase();
  if (c === "KWD") return Math.round(Number(price) * 1000);
  if (c === "JPY" || process.env.MOYASAR_ZERO_DECIMAL === "1")
    return Math.round(Number(price));
  return Math.round(Number(price) * 100);
};

const moyasarMetaStr = (
  meta: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const v = meta?.[key];
  if (v == null) return undefined;
  return String(v);
};

interface MoyasarPaymentLike {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, unknown>;
}

const applyMoyasarPaymentPaid = async (
  payment: MoyasarPaymentLike,
): Promise<void> => {
  if (String(payment.status).toLowerCase() !== "paid") return;

  const meta = payment.metadata || {};
  const purchaseIdMeta =
    moyasarMetaStr(meta, "purchase_id") || moyasarMetaStr(meta, "purchaseId");
  const givenMeta =
    moyasarMetaStr(meta, "given_id") || moyasarMetaStr(meta, "givenId");

  const ors: Record<string, unknown>[] = [];
  if (purchaseIdMeta) ors.push({ _id: purchaseIdMeta });
  if (givenMeta) ors.push({ moyasarGivenId: givenMeta });

  if (ors.length === 0) {
    console.warn(
      `[moyasar] payment_paid missing metadata for payment ${payment.id}`,
    );
    return;
  }

  const open = await Purchases.findOne({
    $and: [
      matchAwaitingPayment(),
      { paymentProvider: PAYMENT_PROVIDER.MOYASAR },
      { $or: ors },
    ],
  });

  if (!open) {
    const idempotent = await Purchases.findOne({
      invoiceId: payment.id,
      status: PURCHASE_STATUS.PAYMENT_DONE,
    });
    if (idempotent)
      await creditVendorsForPurchase(
        idempotent.toJSON() as ModelTypes.IPurchase,
      );
    return;
  }

  const expectedMinor = moyasarMinorAmount(
    Number(open.price),
    payment.currency,
  );
  if (payment.amount !== expectedMinor) {
    console.warn(
      `[moyasar] amount mismatch payment=${payment.amount} expected=${expectedMinor} purchase=${open._id}`,
    );
    return;
  }

  const r = await Purchases.updateOne(
    { $and: [{ _id: open._id }, matchAwaitingPayment()] },
    {
      $set: {
        status: PURCHASE_STATUS.PAYMENT_DONE,
        invoiceId: payment.id,
        paymentProvider: PAYMENT_PROVIDER.MOYASAR,
        updated: now(),
      },
    },
  );

  if (r.matchedCount === 0) return;

  const final = await Purchases.findOne({ _id: open._id });
  if (final)
    await creditVendorsForPurchase(final.toJSON() as ModelTypes.IPurchase);
};

const tryReserveMoyasarClientNotification = async (
  purchaseId: string,
  customerId: string,
): Promise<boolean> => {
  const u = await Purchases.updateOne(
    {
      _id: purchaseId,
      customerId,
      status: PURCHASE_STATUS.PAYMENT_DONE,
      paymentProvider: PAYMENT_PROVIDER.MOYASAR,
      $or: [
        { moyasarNotified: { $ne: true } },
        { moyasarNotified: { $exists: false } },
      ],
    },
    { $set: { moyasarNotified: true, updated: now() } },
  );
  return u.modifiedCount === 1;
};

const revertMoyasarClientNotificationFlag = async (purchaseId: string) => {
  return Purchases.updateOne(
    { _id: purchaseId },
    { $set: { moyasarNotified: false, updated: now() } },
  );
};

// ---------------------------------------------------------------------------
// remove — atomic via session when supported
// ---------------------------------------------------------------------------

const remove = async (purchaseId: string): Promise<ModelTypes.IPurchase> => {
  const purchase = await Purchases.findOne({ _id: purchaseId });
  if (!purchase) throw repoError(404, "Purchase not found.");
  const boxIds = purchase.items.map((i) => i.boxId);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Boxes.updateMany(
        { _id: { $in: boxIds } },
        { $set: { isActive: true } },
        { session },
      );
      await Purchases.deleteOne({ _id: purchaseId }, { session });
    });
  } catch (err) {
    if (isNoTxnSupportError(err)) {
      console.warn("[purchases.remove] running without transaction support");
      await Purchases.deleteOne({ _id: purchaseId });
      await Boxes.updateMany(
        { _id: { $in: boxIds } },
        { $set: { isActive: true } },
      );
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  return purchase.toJSON() as ModelTypes.IPurchase;
};

// ---------------------------------------------------------------------------
// resetByCustomer
// ---------------------------------------------------------------------------

const resetByCustomer = async (
  customerId: string,
): Promise<{ response: string }> => {
  const toRemove = await Purchases.find({
    customerId,
    status: { $ne: PURCHASE_STATUS.COMPLETED },
  }).lean();
  if (!toRemove.length) throw repoError(404, "Purchases not found.");
  const purchaseIds = toRemove.map((p) => p._id);
  const allBoxIds = toRemove.flatMap((p) =>
    (p.items ?? []).map((i: ModelTypes.IPurchaseItem) => i.boxId),
  );
  if (allBoxIds.length) {
    await Boxes.updateMany(
      { _id: { $in: allBoxIds } },
      { $set: { isActive: true } },
    );
  }
  await Purchases.deleteMany({ _id: { $in: purchaseIds } });
  return { response: `All purchase of ${customerId} removed successfully!` };
};

// ---------------------------------------------------------------------------
// MyFatora IPN (webhook) — verify via GetPaymentStatus, then mark paid + credit
// ---------------------------------------------------------------------------

const applyMyFatoraIpn = async (invoiceId: string | number): Promise<void> => {
  const myF = require("../../payment/strategies/myFatora.strategy.js") as {
    getPaymentStatus: (
      k: string | number,
      t?: string,
    ) => Promise<{
      IsSuccess: boolean;
      Data?: {
        InvoiceStatus?: string;
        InvoiceValue?: number;
        InvoiceId?: number;
      };
    }>;
  };
  const invoice = await myF.getPaymentStatus(String(invoiceId), "InvoiceId");
  if (!invoice?.IsSuccess || !invoice.Data) {
    console.warn(`[myfatoora-ipn] GetPaymentStatus failed for ${invoiceId}`);
    return;
  }
  if (invoice.Data.InvoiceStatus !== "Paid") {
    return;
  }

  const ors: Record<string, unknown>[] = [{ invoiceId: String(invoiceId) }];
  const asInt = parseInt(String(invoiceId), 10);
  if (Number.isFinite(asInt)) ors.push({ invoiceId: asInt });

  const open = await Purchases.findOne({
    $and: [matchAwaitingPayment(), { $or: ors }],
  });
  if (!open) {
    const done = await Purchases.findOne({
      status: PURCHASE_STATUS.PAYMENT_DONE,
      $or: ors,
    });
    if (done) {
      await creditVendorsForPurchase(done.toJSON() as ModelTypes.IPurchase);
    }
    return;
  }

  if (Number(invoice.Data.InvoiceValue) !== open.price) {
    console.warn(
      `[myfatoora-ipn] price mismatch inv=${invoiceId} api=${invoice.Data.InvoiceValue} purchase=${open.price}`,
    );
    return;
  }

  await Purchases.updateOne(
    { $and: [{ _id: open._id }, matchAwaitingPayment()] },
    {
      $set: {
        status: PURCHASE_STATUS.PAYMENT_DONE,
        invoiceId: String(invoice.Data.InvoiceId ?? invoiceId),
        paymentProvider: PAYMENT_PROVIDER.MYFATOORA,
        updated: now(),
      },
    },
  );
  const final = await Purchases.findOne({ _id: open._id });
  if (final)
    await creditVendorsForPurchase(final.toJSON() as ModelTypes.IPurchase);
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export = {
  create,
  getById,
  getByIdExpanded,
  getByCustomerId,
  getByInvoiceId,
  getPendingRequests,
  purchasesExpand,
  customerHistory,
  listAll,
  update,
  setProviderFields,
  enableGift,
  getByClaimToken,
  recordGiftClaim,
  giftView,
  listGiftsForUser,
  applyStripePaymentIntentSucceeded,
  applyStripePaymentIntentFailed,
  tryReserveStripeClientNotification,
  revertStripeClientNotificationFlag,
  creditVendorsForPurchase,
  applyMyFatoraIpn,
  applyMoyasarPaymentPaid,
  tryReserveMoyasarClientNotification,
  revertMoyasarClientNotificationFlag,
  remove,
  resetByCustomer,
};
