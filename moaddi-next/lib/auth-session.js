import { isDashboardRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "@/../lib/utils";
import { clearAuthHeaders } from "@/../services/events";
import Cookies from "js-cookie";

/** Dispatched on admin logout so Socket and other listeners can tear down. */
export const ADMIN_LOGOUT_EVENT = "moaddi:admin-logout";

/**
 * Dispatched once the session cookie has been written on login.
 *
 * Login stores the token in a cookie and on axios directly, without touching
 * React state, so nothing above the dashboard SPA re-renders when it happens.
 * Consumers that derive from the stored token (ChatProvider) have no other way
 * to learn the session appeared, and would otherwise sit on a null token until
 * a hard reload.
 */
export const AUTH_SESSION_EVENT = "moaddi:auth-session";

/** Defer to next macrotask — avoids react-admin logout ↔ getPermissions race. */
export function deferResolve(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 0);
  });
}

export function deferReject(error) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error ?? new Error("Not authenticated")), 0);
  });
}

/** Prefer localStorage; fall back to cookie and sync so react-admin auth stays consistent. */
export function readDashboardUser() {
  return readAuthSession().user ?? {};
}

function parseStoredUser(raw) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readUserFromCookie() {
  return parseStoredUser(Cookies.get("user"));
}

function readUserFromLocalStorage() {
  return parseStoredUser(getLocalStorageItem("user"));
}

export function readAuthSession() {
  const cookieUser = readUserFromCookie();
  const storedUser = readUserFromLocalStorage();
  const raw = cookieUser ?? storedUser;
  if (!raw || typeof raw !== "object") {
    return {
      user: null,
      token: null,
      role: undefined,
      isDashboardSession: false,
    };
  }

  const role = normalizeDashboardRole(raw.role);
  const user = { ...raw, role };
  const token = typeof user.token === "string" ? user.token : null;
  const isDashboardSession = isDashboardRole(role);

  if (isDashboardSession && (!storedUser || storedUser.role !== role)) {
    setLocalStorageItem("user", JSON.stringify(user));
  }

  return {
    user,
    token,
    role,
    isDashboardSession,
  };
}

/** True when cookie or localStorage holds an admin/vendor staff session. */
export function hasDashboardSession() {
  return readAuthSession().isDashboardSession;
}

export function getStoredAuthToken() {
  return readAuthSession().token;
}

export function notifyAdminLogout() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT));
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
  }
}

/** Announces that the stored session changed (login). See AUTH_SESSION_EVENT. */
export function notifyAuthSessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
  }
}

/** Clears shared auth storage only for dashboard staff (never shopper sessions). */
export function clearAuthSession() {
  if (!hasDashboardSession()) return;
  Cookies.remove("user");
  removeLocalStorageItem("user");
  clearAuthHeaders();
  notifyAdminLogout();
}
