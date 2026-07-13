/**
 * Web guest-checkout session.
 *
 * `POST /users/guest` is public and returns a signin-shaped payload (role
 * "Guest", a JWT, `isGuest: true`) so the guest can immediately use every
 * authenticated purchase/payment/box endpoint — the same contract the phone
 * and social sign-in flows return. `PUT /users/guest/me` attaches the
 * shopper's contact info and requires the guest's own token, so it must be
 * called after the session from createGuestSession() has been persisted.
 */
import { postRequest, putRequest } from "./events";
import { guestMeAddress, guestSignInAddress } from "./serverAddresses";

export type GuestSession = {
  _id: string;
  role: "Guest";
  isGuest: true;
  token: string;
  expiresIn: number;
  preferredCurrency?: string;
  phone?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

export type GuestContactInfo = {
  phone: string;
  name?: string;
  email?: string;
};

/** POST /users/guest — public, no auth required. */
export async function createGuestSession(): Promise<GuestSession> {
  const response = (await postRequest(guestSignInAddress())) as GuestSession;
  if (!response?.token) {
    throw new Error(
      (response as { message?: string })?.message ||
        "Could not start guest session.",
    );
  }
  return response;
}

/** PUT /users/guest/me — requires the guest's own token to already be set (see persistShopperSession). */
export async function updateGuestInfo(info: GuestContactInfo) {
  return putRequest(guestMeAddress(), info);
}
