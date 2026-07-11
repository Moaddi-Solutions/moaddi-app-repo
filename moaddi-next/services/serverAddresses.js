import { resolveApiBaseUrl, resolveApiV1Base } from "@/../lib/api-base";

const enc = (id) => encodeURIComponent(String(id ?? ""));

/** @returns {string} moaddi-server origin with trailing slash */
export function baseUrl() {
  return resolveApiBaseUrl();
}

export function socketAddress() {
  return resolveApiBaseUrl();
}

export function address() {
  return resolveApiV1Base();
}

export function signInAddress() {
  return `${address()}users/signin`;
}
export function signUpAddress() {
  return `${address()}users/signup`;
}
export function otpAddress() {
  return `${address()}users/otp`;
}
export function socialSignInAddress() {
  return `${address()}users/social`;
}
export function getVendorsAPI() {
  return `${address()}users/role/Vendor`;
}
export function getCustomerAPI() {
  return `${address()}users/role/Customer`;
}
export function addUserAPI() {
  return `${address()}users/create`;
}
export function machinesAPI() {
  return `${address()}machines`;
}
export function shopsAPI() {
  return `${address()}shops`;
}
export function groupsAPI() {
  return `${address()}groups`;
}
export function unassignedMachinesAPI() {
  return `${machinesAPI()}/all`;
}
export function activeMachinesAPI() {
  return `${machinesAPI()}/active`;
}
export function productAPI() {
  return `${address()}products`;
}
export function currenciesAPI() {
  return `${address()}currencies`;
}
export function purchasesAPI() {
  return `${address()}purchases`;
}
export function contentUploadAPI() {
  return `${baseUrl()}content/upload`;
}
export function allPendingRequests() {
  return `${address()}purchases/allpendingrequests`;
}
export function getCertificatesAPI() {
  return `${address()}broker/generatecerts`;
}

export const userAPI = (id) => `${address()}users/${enc(id)}`;
export const shopAPI = (id) => `${address()}shops/${enc(id)}`;
export const groupAPI = (id) => `${address()}groups/${enc(id)}`;
export const contentAPI = (id) => `${baseUrl()}content/${id}`;
export const userToggleAPI = (id) => `${address()}users/${enc(id)}/toggle`;
export const machineAPI = (id) => `${address()}machines/${enc(id)}`;
export const purchaseAPI = (id) => `${address()}purchases/${enc(id)}`;
export const MachinesByVendor = (id) => `${address()}machines/vendor/${enc(id)}`;
export const purchaseByCustomer = (id) =>
  `${address()}purchases/customerHistory/${enc(id)}`;
export const purchaseByInvoice = (id) =>
  `${address()}purchases/invoice/${enc(id)}`;
export const MachinesByProduct = (id) => `${address()}machine/product/${enc(id)}`;
export const MachinesByShop = (id) => `${address()}machine/shop/${enc(id)}`;
export const MachinesByGroup = (id) => `${address()}machine/group/${enc(id)}`;
export const VendorsByShop = (id) => `${address()}vendor/shop/${enc(id)}`;
export const ProductsByMachine = (id) => `${address()}product/machine/${enc(id)}`;
export const ProductsByVendor = (id) => `${address()}product/vendor/${enc(id)}`;
export const machineToggleAPI = (id) =>
  `${address()}machines/${enc(id)}/toggle`;
export const machineQRScan = (code) =>
  `${address()}machines/qrcode/${enc(code)}`;
export const assignMachineAPI = (id) =>
  `${address()}machines/vendor/${enc(id)}/assign`;
export const unassignMachineAPI = (id) =>
  `${address()}machines/${enc(id)}/unassign`;
export const boxUpdateAPI = (id) =>
  `${address()}boxes/product/${enc(id)}/changeproduct`;
export const unassignBoxAPI = (id) =>
  `${address()}boxes/machine/${enc(id)}/unassign`;
export const productsAPI = (id) => `${address()}products/${enc(id)}`;

export function paymentProvidersAPI() {
  return `${address()}paymentProviders`;
}
export const paymentProviderToggleAPI = (id) =>
  `${address()}paymentProviders/${encodeURIComponent(String(id ?? ""))}/toggle`;
export function platformOptionsAPI() {
  return `${address()}options/platform`;
}

export function walletsAPI() {
  return `${address()}wallets`;
}
export function walletsMeAPI() {
  return `${address()}wallets/me`;
}
export const walletAPI = (id) => `${address()}wallets/${enc(id)}`;
export function withdrawalsAPI() {
  return `${address()}withdrawals`;
}
export const withdrawalAPI = (id) => `${address()}withdrawals/${enc(id)}`;
export function transactionsAPI() {
  return `${address()}transactions`;
}
export const transactionAPI = (id) => `${address()}transactions/${enc(id)}`;
export const withdrawalApproveAPI = (id) =>
  `${address()}withdrawals/${enc(id)}/approve`;
export const withdrawalRejectAPI = (id) =>
  `${address()}withdrawals/${enc(id)}/reject`;
export const withdrawalMarkPaidAPI = (id) =>
  `${address()}withdrawals/${enc(id)}/markpaid`;
