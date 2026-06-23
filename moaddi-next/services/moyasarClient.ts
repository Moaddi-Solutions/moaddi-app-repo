import { getAuthToken } from "./cookieAuth";
import { purchasesAPI } from "./serverAddresses";

type PrepareMoyasarCheckoutResponse = {
  givenId: string;
  amount: number;
  currency: string;
  description: string;
  metadata: {
    purchase_id: string;
    customer_id: string;
    given_id: string;
  };
  publishableApiKey: string;
};

const prepareMoyasarCheckout = async (
  purchaseId: string,
  /** Optional; must match the purchase's stored currency. Omit to let the API use the purchase currency. */
  currency?: string,
): Promise<PrepareMoyasarCheckoutResponse> => {
  const token = getAuthToken();
  const body: { purchaseId: string; currency?: string } = { purchaseId };
  if (currency?.trim()) body.currency = currency.trim().toUpperCase();
  const response = await fetch(`${purchasesAPI()}/moyasar-checkout`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j?.message) detail = String(j.message);
    } catch {
      /* use raw body */
    }
    throw new Error(`Moyasar checkout failed (${response.status}): ${detail}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Moyasar checkout returned non-JSON (${contentType}). Is the API URL correct?`,
    );
  }
  return JSON.parse(text) as PrepareMoyasarCheckoutResponse;
};
const finalizeMoyasarPayment = async (purchaseId: string, invoiceId?: string) => {
  const token = getAuthToken();
  const body: { _id: string; invoiceId?: string } = { _id: purchaseId };
  if (invoiceId) body.invoiceId = invoiceId;
  const response = await fetch(`${purchasesAPI()}/moyasarIsPaymentDone`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Finalize payment failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  return JSON.parse(text);
};
export { prepareMoyasarCheckout, finalizeMoyasarPayment };
