import {
  clearAuthSession,
  deferReject,
  deferResolve,
  hasDashboardSession,
  notifyAdminLogin,
  notifyAdminLogout,
  readDashboardUser,
} from "@/../lib/auth-session";
import { isDashboardRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import { setLocalStorageItem } from "@/../lib/utils";
import { getAdminDataProvider } from "@/../services/data-provider";
import { clearAuthHeaders, postRequest } from "@/../services/events";
import { signInAddress } from "@/../services/serverAddresses";
import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";

/** Dashboard routes allowed for Admin and SuperAdmin (same rules). */
const adminAccess = {
  machines: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  vendors: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  customers: (action) =>
    [/*"create",*/ "delete", "edit", "show", "list"].includes(action),
  products: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  currencies: (action) => ["list"].includes(action),
  shops: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  groups: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  notifications: (action) => ["list"].includes(action),
  withdrawals: (action) => ["list", "show", "create"].includes(action),
  wallets: (action) => ["list", "show"].includes(action),
  payments: (action) => ["list", "show"].includes(action),
  invoices: (action) => ["list", "show"].includes(action),
  transactions: (action) => ["list", "show"].includes(action),
  // Site options (payment strategies + platform fees)
  paymentProviders: (action) => ["list"].includes(action),
  paymentProvidersAll: (action) =>
    ["list", "edit"].includes(action),
  platformOptions: (action) => ["show", "edit"].includes(action),
  // Content
  websites: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  docs: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  enBlocks: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show", "list"].includes(action),
  arBlocks: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show", "list"].includes(action),
  zhBlocks: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show", "list"].includes(action),
  itBlocks: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show", "list"].includes(action),
  enSite: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  arSite: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  zhSite: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  itSite: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  enSeo: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  arSeo: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  zhSeo: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  itSeo: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  enFooterBody: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  arFooterBody: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  zhFooterBody: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  itFooterBody: (action) =>
    [/*"create",*/ /* "delete",*/ "edit", "show" /*"list"*/].includes(action),
  enHeaderLinks: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  arHeaderLinks: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  zhHeaderLinks: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  itHeaderLinks: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  enPages: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  arPages: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  zhPages: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
  itPages: (action) =>
    ["create", "delete", "edit", "show", "list"].includes(action),
};

const accessControlStrategies = {
  Admin: adminAccess,
  SuperAdmin: adminAccess,
  Vendor: {
    machines: (action) => ["show", "list"].includes(action),
    products: (action) => ["show", "list"].includes(action),
    notifications: (action) => ["list"].includes(action),
    docs: (action) => ["show", "list"].includes(action),
    groups: (action) =>
      ["create", "delete", "edit", "show", "list"].includes(action),
    paymentProviders: (action) => ["list", "show"].includes(action),
    paymentProvidersAll: (action) => ["list", "show"].includes(action),
    wallets: (action) => ["list", "show"].includes(action),
    withdrawals: (action) => ["list", "show", "create"].includes(action),
    transactions: (action) => ["list", "show"].includes(action),
  },
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

const getPermissions = () => getIdentity();

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
    // Dashboard login is a client-side nav (no reload), so anything that
    // read the cookie before it existed — e.g. ChatProvider's dashboardSession
    // — needs an explicit nudge to re-read it now that it does.
    notifyAdminLogin();
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
  canAccess({ resource, action, record, signal }) {
    const { role } = readDashboardUser();
    return accessControlStrategies[role]?.[resource]?.(action) ?? false;
  },
};
