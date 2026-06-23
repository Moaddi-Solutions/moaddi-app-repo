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
  let raw = {};
  let fromCookie = false;
  const stored = getLocalStorageItem("user");
  if (stored) {
    try {
      raw = JSON.parse(stored);
    } catch {
      raw = {};
    }
  } else {
    const cookie = Cookies.get("user");
    if (cookie) {
      fromCookie = true;
      try {
        raw = JSON.parse(cookie);
      } catch {
        raw = {};
      }
    }
  }
  const role = normalizeDashboardRole(raw.role);
  const user = { ...raw, role };
  if (Object.keys(raw).length && (fromCookie || role !== raw.role)) {
    setLocalStorageItem("user", JSON.stringify(user));
  }
  return user;
}

function readRoleFromCookie() {
  const raw = Cookies.get("user");
  if (!raw) return undefined;
  try {
    return normalizeDashboardRole(JSON.parse(raw).role);
  } catch {
    return undefined;
  }
}

function readRoleFromLocalStorage() {
  try {
    const raw = JSON.parse(getLocalStorageItem("user") ?? "{}");
    return normalizeDashboardRole(raw.role);
  } catch {
    return undefined;
  }
}

/** True when cookie or localStorage holds an admin/vendor staff session. */
export function hasDashboardSession() {
  const cookieRole = readRoleFromCookie();
  const storageRole = readRoleFromLocalStorage();
  return isDashboardRole(cookieRole) || isDashboardRole(storageRole);
}

export function getStoredAuthToken() {
  const raw = Cookies.get("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw).token ?? null;
  } catch {
    return null;
  }
}

export function notifyAdminLogout() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT));
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
