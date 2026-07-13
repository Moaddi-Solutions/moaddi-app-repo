import { normalizeDashboardRole } from "@/../lib/dashboard-role";
import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";

/**
 * Turns a signin-shaped API payload (`_id, role, token, expiresIn, ...`) into
 * the shopper session object stored in the `user` cookie, and writes the
 * cookie + axios Authorization header. Phone sign-in, social sign-in, and
 * guest creation all return this same payload shape, so this is the one
 * write path shared by all three producers — keeps cookie/header from
 * drifting out of sync the way three separate copies of this logic would.
 *
 * Does NOT touch localStorage: CartProvider already mirrors `user` state
 * there whenever `setUser(...)` is called, which covers shopper roles.
 * Dashboard roles are persisted to localStorage by the caller instead (see
 * UserAuthForm's sign-in branch), since they never go through `setUser`.
 */
export function persistShopperSession(payload, { defaultRole } = {}) {
  const role = normalizeDashboardRole(payload.role) || defaultRole || payload.role;
  const expiryDays = (payload.expiresIn || 0) / 60 / 60 / 24 || 30;
  const expiresAt = moment().add(expiryDays, "days").toDate();
  const session = { ...payload, role, expiresIn: expiresAt.getTime() };

  Cookies.set("user", JSON.stringify(session), { expires: expiresAt });
  if (session.token) {
    axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
  }
  return session;
}
