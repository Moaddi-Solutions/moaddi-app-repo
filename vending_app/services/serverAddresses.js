// API + sockets + raw image paths use this origin. Override for local/ngrok (must match your moaddi-server base URL).
const rawOrigin =
  typeof process.env.EXPO_PUBLIC_SERVER_ORIGIN === "string" &&
  process.env.EXPO_PUBLIC_SERVER_ORIGIN.trim() !== ""
    ? process.env.EXPO_PUBLIC_SERVER_ORIGIN.trim().replace(/\/?$/, "/")
    : "https://server.moaddi-app.com/";
export const baseUrl = rawOrigin;
export const socketAddress = baseUrl;
export const address = baseUrl + "api/v1/";

export const signInAddress = address + "users/signin";
export const signUpAddress = address + "users/signup";
export const otpAddress = address + "users/otp";
export const getVendorsAPI = address + "users/role/Vendor";
export const getCustomerAPI = address + "users/role/Customer";
export const addUserAPI = address + "users/create";
export const machinesAPI = address + "machines";
export const shopsAPI = address + "shops";
export const groupsAPI = address + "groups";
export const unassignedMachinesAPI = machinesAPI + "/all";
export const productAPI = address + "products";
export const purchasesAPI = address + "purchases";
export const contentUploadAPI = baseUrl + "content/upload";
export const allPendingRequests = address + "purchases/allpendingrequests";
export const getCertificatesAPI = address + "broker/generatecerts";

export const userAPI = (id) => address + "users/" + id;
export const shopAPI = (id) => address + "shops/" + id;
export const groupAPI = (id) => address + "groups/" + id;
export const contentAPI = (id) => baseUrl + "content/" + id;
export const userToggleAPI = (id) => address + "users/" + id + "/toggle";
export const machineAPI = (id) => address + "machines/" + id;
export const purchaseAPI = (id) => address + "purchases/" + id;
export const MachinesByVendor = (id) => address + "machines/vendor/" + id;
export const ShopsByVendor = (id) => address + "shops/vendor/" + id;
export const purchaseByCustomer = (id) =>
  address + "purchases/customerHistory/" + id;
export const purchaseByInvoice = (id) => address + "purchases/invoice/" + id;
export const MachinesByProduct = (id) => address + "machine/product/" + id;
export const MachinesByShop = (id) => address + "machine/shop/" + id;
export const MachinesByShopVendor = (shopId, vendorId) =>
  `${address}machine/shop/${shopId}/vendor/${vendorId}`;
export const MachinesByGroup = (id) => address + "machine/group/" + id;
export const VendorsByShop = (id) => address + "vendor/shop/" + id;
export const ProductsByMachine = (id) => address + "product/machine/" + id;
export const ProductsByVendor = (id) => address + "product/vendor/" + id;
export const machineToggleAPI = (id) => address + "machines/" + id + "/toggle";
export const machineQRScan = (id) => address + "machines/qrcode/" + id;
export const assignMachineAPI = (id) =>
  address + "machines/vendor/" + id + "/assign";
export const unassignMachineAPI = (id) =>
  address + "machines/" + id + "/unassign";
export const boxUpdateAPI = (id) =>
  address + "boxes/product/" + id + "/changeproduct";
export const unassignBoxAPI = (id) =>
  address + "boxes/machine/" + id + "/unassign";
export const productsAPI = (id) => address + "products/" + id;

export const myWalletAPI = address + "wallets/me";
export const myTransactionsAPI = address + "transactions";
export const myWithdrawalsAPI = address + "withdrawals";
export const withdrawalCreateAPI = address + "withdrawals";

/** Media origin for /images and other static assets (defaults to API origin). */
export const mediaBaseUrl = () => {
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_STATIC === "string" &&
    process.env.EXPO_PUBLIC_STATIC.trim() !== ""
      ? process.env.EXPO_PUBLIC_STATIC.trim()
      : rawOrigin;
  return fromEnv.replace(/\/+$/, "");
};

export const normalizeAssetPath = (path) =>
  String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

/**
 * Resolve a product/shop image field to a fetchable URL.
 * Accepts API path strings, `{ src }` objects, or absolute URLs.
 */
export const productImageUrl = (image) => {
  if (image == null || image === "") return null;
  if (typeof image === "object" && image.src) return productImageUrl(image.src);
  const path = typeof image === "string" ? image : String(image);
  if (/^https?:\/\//i.test(path)) return path;
  return `${mediaBaseUrl()}/${normalizeAssetPath(path)}`;
};

/** Public image URL for withdrawal proof (served from moaddi-server /images). */
export const withdrawalProofImageUrl = (filename) => {
  if (!filename) return null;
  const name = normalizeAssetPath(filename).replace(/^images\//, "");
  return `${mediaBaseUrl()}/images/${name}`;
};
