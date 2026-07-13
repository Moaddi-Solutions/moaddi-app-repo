import { getRequest, postRequest } from "./events";
import {
  giftClaimAPI,
  giftEnableAPI,
  giftPreviewAPI,
  giftsMineAPI,
} from "./serverAddresses";

/**
 * Web gift-a-purchase client. Calls the already-deployed server gift endpoints
 * (moaddi-server/app/routes/controllers/gifts.ts) — no backend changes. Uses the
 * client HTTP layer (services/events, cookie-based axios auth) because these run
 * from client components (BoxGrid share action, the /gift/[token] claim page).
 */

/**
 * The client `events` layer lets axios throw on non-2xx, so surface the
 * server's `{ message }` body (403/404/409/410 from the gift endpoints) rather
 * than a bare "Request failed with status code N".
 */
const withMessage = (error, fallback) =>
  new Error(error?.response?.data?.message || error?.message || fallback);

/**
 * Enable sharing on a paid purchase (owner/admin only, idempotent). Returns
 * `{ claimToken, claimUrl, expiresAt }`. The web builds its own claim URL from
 * `window.location.origin`, so the server's `claimUrl` is not relied upon.
 */
export const enableGift = async (purchaseId) => {
  try {
    const result = await postRequest(giftEnableAPI(purchaseId));
    if (!result?.claimToken) {
      throw new Error(result?.message || "Could not create the gift link.");
    }
    return result;
  } catch (error) {
    throw withMessage(error, "Could not create the gift link.");
  }
};

/** Public preview for the recipient's claim screen. Throws on 404/410. */
export const getGiftPreview = async (claimToken) => {
  return getRequest(giftPreviewAPI(claimToken));
};

/**
 * Claim the gift. Anonymous callers get a full Guest `session` (same signin
 * shape persistShopperSession expects); a signed-in caller reuses their
 * identity (`session: null`). Returns `{ session, openerId, purchase }`.
 */
export const claimGift = async (claimToken) => {
  try {
    const result = await postRequest(giftClaimAPI(claimToken));
    if (!result?.purchase) {
      throw new Error(result?.message || "Could not claim this gift.");
    }
    return result;
  } catch (error) {
    throw withMessage(error, "Could not claim this gift.");
  }
};

/**
 * Gifts dashboard for the signed-in user: `{ sent, received }` lists with a
 * derived `giftStatus` (pending | claimed | collected | expired) per item.
 */
export const listMyGifts = async () => {
  try {
    const result = await getRequest(giftsMineAPI());
    return {
      sent: Array.isArray(result?.sent) ? result.sent : [],
      received: Array.isArray(result?.received) ? result.received : [],
    };
  } catch (error) {
    throw withMessage(error, "Could not load your gifts.");
  }
};
