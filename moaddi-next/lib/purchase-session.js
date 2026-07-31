/** Purchase session helpers (cart merge + in-app notices, no forced redirects). */

export const PURCHASE_NOTICE_KIND = {
  AWAITING_PAYMENT: "awaiting_payment",
  READY_TO_COLLECT: "ready_to_collect",
  PAYMENT_REJECTED: "payment_rejected",
};

export function isAwaitingPaymentPurchase(p) {
  if (!p || typeof p !== "object") return false;
  const s = p.status;
  return s == null || s === "" || s === "PaymentDoneRequest";
}

export function hasCheckoutLineItems(purchase) {
  if (!purchase || typeof purchase !== "object") return false;
  const boxes = purchase.boxes;
  if (Array.isArray(boxes) && boxes.length > 0) return true;
  const items = purchase.items;
  return Array.isArray(items) && items.length > 0;
}

export function countUnopenedBoxes(purchase) {
  const boxes = purchase?.boxes;
  if (!Array.isArray(boxes)) return 0;
  return boxes.filter((b) => !b.boxStatus).length;
}

/**
 * Active shopper notice derived from purchase state.
 * @returns {null | { kind: string, purchaseId: string, href: string, unopened?: number, price?: number, currency?: string }}
 */
export function getPurchaseNotice(user) {
  const purchase = user?.purchase;
  const preferredCurrency = user?.preferredCurrency;
  if (!purchase?._id) return null;
  const purchaseId = String(purchase._id);
  const status = purchase.status;

  if (status === "PaymentRejected") {
    return {
      kind: PURCHASE_NOTICE_KIND.PAYMENT_REJECTED,
      purchaseId,
      href: "/checkout",
    };
  }

  if (status === "PaymentDone" || status === "Processing") {
    const unopened = countUnopenedBoxes(purchase);
    if (unopened <= 0) return null;
    const invoiceKey = purchase.invoiceId ?? purchaseId;
    return {
      kind: PURCHASE_NOTICE_KIND.READY_TO_COLLECT,
      purchaseId,
      unopened,
      href: `/invoice/success?invoiceId=${encodeURIComponent(String(invoiceKey))}`,
    };
  }

  if (isAwaitingPaymentPurchase(purchase) && hasCheckoutLineItems(purchase)) {
    return {
      kind: PURCHASE_NOTICE_KIND.AWAITING_PAYMENT,
      purchaseId,
      href: "/checkout",
      price: purchase.price,
      currency: preferredCurrency,
    };
  }

  return null;
}

export function noticeDismissStorageKey(userId, notice) {
  return `moaddi-purchase-notice-dismissed:${userId}:${notice.purchaseId}:${notice.kind}`;
}

export function isNoticeTargetPath(pathname, href) {
  if (!pathname || !href) return false;
  const base = href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Fields that only ever come from the sign-in/cookie flow, never from a
 * profile fetch. `GET /users/:id` returns the raw Mongo user document, which
 * has no `token` field — JWTs are never persisted server-side. Every branch
 * below that returns `next` (the profile response) would otherwise silently
 * drop the caller's auth token from client state.
 */
const SESSION_ONLY_FIELDS = ["token"];

function withPreservedSessionFields(prev, merged) {
  if (!prev || !merged || merged === prev) return merged;
  const patch = {};
  for (const field of SESSION_ONLY_FIELDS) {
    if (prev[field] !== undefined && merged[field] === undefined) {
      patch[field] = prev[field];
    }
  }
  return Object.keys(patch).length ? { ...merged, ...patch } : merged;
}

export function mergeServerUser(prev, next) {
  // Never resurrect a signed-out session: a background refetch that resolves
  // after logout has nothing to merge into, so keep `prev` (null) as-is.
  if (!prev) return prev;
  if (!next || typeof next !== "object") return prev ?? next;
  const prevP = prev?.purchase;
  const nextP = next.purchase;

  let merged = next;

  if (!nextP && prevP && isAwaitingPaymentPurchase(prevP)) {
    merged = { ...next, purchase: prevP };
  } else if (!prevP?._id || !nextP?._id) {
    merged = next;
  } else if (String(prevP._id) !== String(nextP._id)) {
    merged = next;
  } else if (nextP.boxes == null && prevP.boxes != null) {
    merged = { ...next, purchase: { ...nextP, boxes: prevP.boxes } };
  } else if (
    Array.isArray(nextP.boxes) &&
    nextP.boxes.length === 0 &&
    Array.isArray(prevP.boxes) &&
    prevP.boxes.length > 0 &&
    isAwaitingPaymentPurchase(nextP)
  ) {
    merged = { ...next, purchase: { ...nextP, boxes: prevP.boxes } };
  }

  return withPreservedSessionFields(prev, merged);
}
