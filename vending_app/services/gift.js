import { getRequest, postRequest } from "./httpClient";
import {
  giftClaimAPI,
  giftEnableAPI,
  giftPreviewAPI,
  giftPurchaseAPI,
  giftsMineAPI,
} from "./serverAddresses";

/**
 * Gift a purchase: the buyer enables a bearer claim link so either they or a
 * recipient can open the vending box. See the server design at
 * moaddi-server/docs/superpowers/specs/2026-07-11-gift-a-purchase-design.md.
 */

/**
 * Enable sharing on a paid purchase (idempotent). Returns
 * `{ claimToken, claimUrl, expiresAt }`.
 */
export const enableGift = async (purchaseId) => {
  const result = await postRequest(giftEnableAPI(purchaseId));
  if (!result || result.statusCode || !result.claimToken) {
    throw new Error(result?.message || "Could not create the gift link.");
  }
  return result;
};

/** Public preview for the recipient's claim screen. */
export const getGiftPreview = async (claimToken) => {
  return getRequest(giftPreviewAPI(claimToken));
};

/**
 * Claim the gift. Anonymous callers get a full Guest `session` (same shape as a
 * guest sign-in); a signed-in caller reuses their identity (`session: null`).
 * Returns `{ session, openerId, purchase }`.
 */
export const claimGift = async (claimToken) => {
  const result = await postRequest(giftClaimAPI(claimToken));
  if (!result || result.statusCode || !result.purchase) {
    throw new Error(result?.message || "Could not claim this gift.");
  }
  return result;
};

/**
 * Gifts dashboard for the signed-in user: `{ sent, received }` lists with a
 * derived `giftStatus` (pending | claimed | collected | expired) per item.
 */
/**
 * Openable purchase view for a gift the user can open (buyer or authorized
 * opener): `{ _id, customerId, machineId, machine, boxes, status, ... }` —
 * the same shape the claim endpoint returns, ready for the box-open flow.
 */
export const getGiftPurchase = async (purchaseId) => {
  const result = await getRequest(giftPurchaseAPI(purchaseId));
  if (!result || result.statusCode || !result._id) {
    throw new Error(result?.message || "Could not open this gift.");
  }
  return result;
};

export const listMyGifts = async () => {
  const result = await getRequest(giftsMineAPI());
  if (!result || result.statusCode) {
    throw new Error(result?.message || "Could not load your gifts.");
  }
  return {
    sent: Array.isArray(result.sent) ? result.sent : [],
    received: Array.isArray(result.received) ? result.received : [],
  };
};
