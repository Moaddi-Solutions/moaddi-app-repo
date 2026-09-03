/**
 * TypeScript interfaces for every Mongoose model in this project.
 *
 * These are plain-object shapes (not Mongoose Documents) — import them
 * anywhere you need a typed representation of a persisted entity.
 *
 * Model files themselves use `export =` for CJS backward-compat with the
 * existing JS repos; types live here so both TS and JS consumers share one
 * source of truth.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type PaymentProvider = 'myfatoora' | 'stripe' | 'moyasar';

export type PurchaseStatus =
  | 'PaymentDoneRequest'
  | 'PaymentDone'
  | 'PaymentRejected'
  | 'Processing'
  | 'Completed';

// ---------------------------------------------------------------------------
// Box
// ---------------------------------------------------------------------------

export interface IBox {
  _id: string;
  name: string;
  cabinNumber: number;
  boxNumber: number;
  machineId: string;
  productId: string | null;
  /** true = open (locker) */
  status: boolean;
  isFilled: boolean;
  isActive: boolean;
  isDeleted: boolean;
  created: Date;
  updated?: Date;
  /** Allows extra runtime fields written after retrieval (schema strict: false) */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

/**
 * Machine communication type values stored in the `type` field.
 * 0 = Direct | 1 = MQTT | 2 = Bluetooth (zbmpos/Wifi4G)
 * 3 = kaisijin-12 | 4 = Bluetooth 4 | 5 = Bluetooth 3
 */
export type MachineType = 0 | 1 | 2 | 3 | 4 | 5;

export interface IMachine {
  _id: string;
  mac: string;
  name: string;
  /** Number of boxes (capacity) */
  boxes: number;
  qrCode: string;
  type: MachineType | number;
  password?: string | null;
  vendorId?: string | null;
  shopId?: string;
  /**
   * Shop Owner cut (0–100). Null inherits the shop's `defaultCommissionPercent`.
   */
  commissionPercent?: Money | number | null;
  /** Staff users assigned to fill this machine (many-to-many). */
  supplierIds?: string[];
  /** Single Support user assigned to this machine (nullable). Legacy dual-read. */
  supportUserId?: string | null;
  /** Audience-keyed Contact assignees (unique audience; `all` = fallback). */
  supportAssignments?: { audience: string; userId: string }[];
  groupId?: string;
  specialProducts?: Record<string, unknown>;
  location?: string;
  paymentProvider?: string | null;
  isConnected: boolean;
  isAssigned: boolean;
  isActive: boolean;
  isDeleted: boolean;
  created: Date;
  updated?: Date;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

export interface IPurchaseItem {
  machineId?: string;
  productId: string;
  boxId: string;
  boxStatus: boolean;
}

/**
 * Gift-a-purchase: bearer claim link so the buyer or a recipient can open the
 * box. `authorizedOpeners` holds ids allowed to open besides `customerId`.
 */
export interface IGift {
  isGift?: boolean;
  claimToken?: string | null;
  sharedAt?: Date;
  expiresAt?: Date;
  authorizedOpeners?: string[];
  claimedAt?: Date;
}

export interface IPurchase {
  _id: string;
  customerId: string;
  /** ISO currency the customer checked out in (from profile or request). */
  preferredCurrency?: string;
  machineId?: string;
  /** Shop / supplier the machine belonged to at purchase time (denormalized). */
  shopId?: string | null;
  vendorId?: string | null;
  items: IPurchaseItem[];
  price?: number;
  status?: PurchaseStatus | string;
  /** My Fatoora numeric id | Stripe `payment_intent` id (pi_…) */
  invoiceId?: string;
  paymentProvider?: PaymentProvider;
  /** Moyasar PaymentConfig.givenId / idempotency key set at checkout prep */
  moyasarGivenId?: string;
  /** true after /purchases/stripeIsPaymentDone completed client-side notifications */
  stripeNotified?: boolean;
  /** true after /purchases/moyasarIsPaymentDone completed client-side notifications */
  moyasarNotified?: boolean;
  /** Gift-a-purchase claim link + authorized openers (see IGift). */
  gift?: IGift;
  created: Date;
  updated?: Date;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface IProduct {
  _id: string;
  name: string;
  /** undefined = all machines support it */
  supportedMachines?: string[];
  currency: string;
  localPrice: {
    originalPrice: number;
    tax: number;
    salePrice: number;
    campaignPrice?: number;
  };
  usdPrice: {
    originalPrice: number;
    tax: number;
    salePrice: number;
    campaignPrice?: number;
  };
  image?: string;
  barCode: string;
  /**
   * Legacy/derived fields.
   * Some repos/controllers return flattened prices and/or vendorId in responses.
   * The underlying Mongo schema is strict:false, so these may also exist in stored rows.
   */
  vendorId?: string | null;
  /** Denormalized from the vendor's shop; drives Shop Admin scoping. */
  shopId?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  isDeleted: boolean;
  created: Date;
  updated?: Date;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export interface IShop {
  _id: string;
  name: string;
  description: string;
  image?: string;
  createdBy?: string | null;
  ownerId?: string | null;
  /** Default Shop Owner cut (0–100) when a machine has no override. */
  defaultCommissionPercent?: Money | number | null;
  /** Single Support user assigned to this shop (nullable). Legacy dual-read. */
  supportUserId?: string | null;
  /** Audience-keyed Contact assignees (unique audience; `all` = fallback). */
  supportAssignments?: { audience: string; userId: string }[];
  isActive: boolean;
  isDeleted: boolean;
  created: Date;
  updated?: Date;
}

// ---------------------------------------------------------------------------
// Groups (group-list model)
// ---------------------------------------------------------------------------

export interface IGroup {
  _id: string;
  name: string;
  created: Date;
  updated?: Date;
}

// ---------------------------------------------------------------------------
// Group (single-group model — has qrCode)
// ---------------------------------------------------------------------------

export interface ISingleGroup {
  _id: string;
  name: string;
  qrCode: string;
  created: Date;
  updated?: Date;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface IUser {
  _id: string;
  password: string;
  name: string;
  role: string;
  otp?: number;
  preferredCurrency?: string;
  /** Additional registered numbers; `_id` is the primary login key. */
  phoneNumbers?: string[];
  /** Guest checkout: guests get a synthetic `_id`; `phone` holds the collected number (normalized) for merge-by-phone. */
  isGuest?: boolean;
  phone?: string;
  email?: string;
  isActive: boolean;
  isDeleted: boolean;
  /**
   * Which audiences this agent answers "contact support" for — a `Support`
   * account or a custom-role Staff member. See `assertSupportAudiences` in
   * the users repo.
   */
  supportAudiences?: string[];
  /**
   * Tenant staff: owning Vendor or ShopOwner `_id`. Stamped server-side on
   * create — never accepted from the client body.
   */
  tenantId?: string | null;
  /** `Vendor` or `ShopOwner`. */
  tenantRole?: 'Vendor' | 'ShopOwner' | string | null;
  shopId?: string | null;
  ownedShopIds?: string[] | null;
  /** Expo push tokens, one per signed-in device. */
  expoPushTokens?: string[] | null;
  created: Date;
  updated?: Date;
}

/** Instance methods added to user documents via UsersSchema.methods */
export interface IUserMethods {
  checkPassword: (password: string) => boolean;
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

export type EventType = 'IR' | 'LOCKER' | string;

export interface IEvent {
  _id: string;
  machineId: string;
  type: EventType;
  boxes: unknown[];
  value: number;
  created: Date;
}

// ---------------------------------------------------------------------------
// Placement request (Vendor → Shop Admin machine placement)
// ---------------------------------------------------------------------------

export type PlacementRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IPlacementRequest {
  _id: string;
  vendorId: string;
  shopId: string;
  /** Set when the vendor already has a machine to place; optional for intent-only. */
  machineId?: string | null;
  machineName?: string | null;
  machineMac?: string | null;
  /** Free-text notes / product type for the placement. */
  notes?: string | null;
  status: PlacementRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  created: Date;
  updated?: Date | null;
  isDeleted: boolean;
}

// ---------------------------------------------------------------------------
// Wallet / Transaction / Withdrawal / Options
// ---------------------------------------------------------------------------

import type { Types } from 'mongoose';

/** Stored as Mongoose Decimal128 in MongoDB; parsed via `.toString()` at the boundary. */
export type Money = Types.Decimal128;

export interface IWallet {
  _id: string;
  vendorId: string;
  /** Denormalized from the vendor's shop; drives Shop Admin scoping. */
  shopId?: string | null;
  currency: string;
  balance: Money;
  isActive: boolean;
  isDeleted: boolean;
  created: Date;
  updated?: Date;
}

export type TransactionType = 'CREDIT' | 'DEBIT';
export type TransactionKind =
  | 'purchase'
  | 'withdrawal'
  | 'adjustment'
  /** Shop Owner cut of a purchase (wallet owner id stored in `vendorId`). */
  | 'commission';

export interface ITransactionPurchaseSummaryItem {
  productId: string;
  productName: string;
  machineId?: string;
  boxId: string;
}

/** Attached on GET /transactions when `purchaseId` is set (server-computed). */
export interface ITransactionPurchaseSummary {
  _id: string;
  customerId: string;
  preferredCurrency?: string;
  price?: number;
  status?: string;
  items: ITransactionPurchaseSummaryItem[];
}

export interface ITransaction {
  _id: string;
  walletId: string;
  vendorId: string;
  /** Denormalized from the vendor's shop; drives Shop Admin scoping. */
  shopId?: string | null;
  type: TransactionType;
  kind: TransactionKind;
  amount: Money;
  currency: string;
  balanceAfter: Money;
  purchaseId?: string | null;
  withdrawalId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
  created: Date;
  purchaseSummary?: ITransactionPurchaseSummary | null;
}

export type WithdrawalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface IBankDetails {
  accountHolder: string;
  iban: string;
  bankName: string;
  swift?: string;
}

export interface IWithdrawal {
  _id: string;
  vendorId: string;
  /** Denormalized from the vendor's shop; drives Shop Admin scoping. */
  shopId?: string | null;
  walletId: string;
  amount: Money;
  currency: string;
  status: WithdrawalStatus;
  bankDetails: IBankDetails;
  requestedAt: Date;
  decidedBy?: string;
  decidedAt?: Date;
  rejectionReason?: string;
  transactionId?: string;
  paidAt?: Date;
  /** Filename under /images (admin transfer proof, optional). */
  proofImage?: string;
}

export interface IPaymentProviderState {
  isActive: boolean;
}

export interface IOptions {
  _id: 'platform';
  platformFeePercent: Money;
  currency: string;
  paymentProviders?: Record<string, IPaymentProviderState>;
  updatedBy?: string;
  updated?: Date;
}

export type Role = 'SuperAdmin' | 'ShopOwner' | 'Vendor' | 'Customer';

