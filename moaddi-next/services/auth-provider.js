import {
  clearAuthSession,
  deferReject,
  deferResolve,
  hasDashboardSession,
  notifyAdminLogout,
  notifyAuthSessionChange,
  readDashboardUser,
} from "@/../lib/auth-session";
import { buildAbility, canAccessResource } from "@/../lib/ability";
import { isDashboardRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import { setLocalStorageItem } from "@/../lib/utils";
import { getAdminDataProvider } from "@/../services/data-provider";
import { clearAuthHeaders, postRequest } from "@/../services/events";
import { getRequest } from "@/../services/events";
import { myPermissionsAddress, signInAddress } from "@/../services/serverAddresses";
import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";

/**
 * CASL ability for the current dashboard user. Rules arrive packed in the
 * signin response; sessions created before the CASL rollout are backfilled
 * from GET users/me/permissions and persisted alongside the stored user.
 */
let abilityCache = { key: null, ability: null };
let rulesRefresh = null;

const abilityKeyFor = (user) =>
  `${user?._id ?? ""}:${user?.role ?? ""}:${Array.isArray(user?.rules) ? user.rules.length : -1}`;

const abilityFor = (user) => {
  const key = abilityKeyFor(user);
  if (abilityCache.key !== key) {
    abilityCache = { key, ability: buildAbility(user?.rules) };
  }
  return abilityCache.ability;
};

const backfillRules = async (user) => {
  if (!rulesRefresh) {
    rulesRefresh = getRequest(myPermissionsAddress())
      .then((data) => {
        const rules = data?.rules ?? data?.data?.rules;
        if (Array.isArray(rules)) {
          setLocalStorageItem("user", JSON.stringify({ ...user, rules }));
          return rules;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        rulesRefresh = null;
      });
  }
  return rulesRefresh;
};

/** E.164 login id for staff sign-in (matches server `credentials._id.toLowerCase()`). */
function normalizeStaffLoginId(username) {
  const raw = String(username ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!raw) return raw;
  if (raw.startsWith("+")) return raw.toLowerCase();
  if (/^\d+$/.test(raw)) return `+${raw}`.toLowerCase();
  return raw.toLowerCase();
}

const getIdentity = () => {
  const user = readDashboardUser();
  if (isDashboardRole(user.role)) {
    return deferResolve(user);
  }
  if (user.created) {
    return deferResolve(user);
  }
  if (user._id) {
    const ret = getAdminDataProvider()
      .getOne("customers", { id: user._id })
      .then(({ data }) => data);
    ret.then((r) =>
      setLocalStorageItem("user", JSON.stringify({ ...user, ...r })),
    );
    return ret;
  }
  return deferReject();
};

const getPermissions = async () => {
  const user = readDashboardUser();
  // Sessions from before the CASL rollout have no stored rules — backfill
  // them so resource registration can build the ability synchronously.
  if (isDashboardRole(user.role) && !Array.isArray(user.rules)) {
    const rules = await backfillRules(user);
    if (rules) return { ...user, rules };
  }
  return getIdentity();
};

const checkAuth = () => {
  const { role } = readDashboardUser();
  return isDashboardRole(role) ? deferResolve() : deferReject();
};

const logout = () => {
  if (hasDashboardSession()) {
    clearAuthSession();
  } else {
    clearAuthHeaders();
    notifyAdminLogout();
  }
  return deferResolve("/login");
};

const login = async ({ username, password }) => {
  const info = {
    _id: normalizeStaffLoginId(username),
    password,
    rememberMe: false,
  };
  try {
    const response = await postRequest(signInAddress(), info);
    response.role = normalizeDashboardRole(response.role);
    if (!isDashboardRole(response.role)) {
      return Promise.reject(
        new Error("This account is not authorized for staff login."),
      );
    }
    const expiryDays = response.expiresIn / 60 / 60 / 24;
    const cookieExpiresAt = moment().add(expiryDays, "days").toDate();
    response.expiresIn = cookieExpiresAt.getTime();
    Cookies.set("user", JSON.stringify(response), { expires: cookieExpiresAt });
    setLocalStorageItem("user", JSON.stringify(response));
    axios.defaults.headers.common.Authorization = `Bearer ${response.token}`;
    // The cookie is the only record of this token — nothing above the SPA
    // re-renders on login, so ChatProvider has to be told the session exists.
    notifyAuthSessionChange();
    return deferResolve();
  } catch (error) {
    const message =
      error?.response?.data?.message ?? error?.message ?? "Login failed";
    return Promise.reject(new Error(message));
  }
};
export default {
  checkAuth,
  login,
  getIdentity,
  getPermissions,
  logout,
  checkError(error) {
    const status = error?.status ?? error?.response?.status;
    const response = error?.response;
    if (status === 401) {
      return Promise.reject(
        Object.assign(new Error("Session expired"), { message: false }),
      );
    }
    if (response?.data?.message) throw new Error(response?.data?.message);
    return Promise.resolve();
  },
  async canAccess({ resource, action }) {
    const user = readDashboardUser();
    if (!isDashboardRole(user.role)) return false;
    let ability = abilityFor(user);
    if (!Array.isArray(user.rules)) {
      const rules = await backfillRules(user);
      if (rules) ability = abilityFor({ ...user, rules });
    }
    return canAccessResource(ability, resource, action);
  },
};
