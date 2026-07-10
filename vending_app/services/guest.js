import { setItem } from "~/lib/utils";
import { postRequest, putRequest } from "./httpClient";
import { guestInfoAddress, guestSessionAddress } from "./serverAddresses";

/**
 * Create a guest session on the server and persist it as the current user.
 * The returned record carries a real JWT (role "Guest"), so every
 * authenticated endpoint (purchases, payment, boxes) works unchanged.
 *
 * Persists to AsyncStorage immediately so the very next request (which reads
 * the token via `getItem("user")`) is authenticated even before React state
 * has re-rendered.
 */
export const startGuestSession = async (setUser) => {
  const result = await postRequest(guestSessionAddress);
  if (!result || result.statusCode || !result.token) {
    throw new Error(result?.message || "Could not start guest session.");
  }
  await setItem("user", result);
  setUser(result);
  return result;
};

/**
 * Save contact info collected from the guest (phone required, name/email
 * optional). Merged into a real account later if they sign up/in with the
 * same phone.
 */
export const saveGuestInfo = async ({ phone, name, email }) => {
  return putRequest(guestInfoAddress, { phone, name, email });
};
