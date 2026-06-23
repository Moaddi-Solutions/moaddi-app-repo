import { getAuthToken } from "./cookieAuth";
import { paymentProvidersAPI, purchasesAPI } from "./serverAddresses";

export type PaymentProviderRow = {
  id: string;
  name: string;
  isActive: boolean;
};

export type StripePaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
};

const stripeIntentRequests = new Map<string, Promise<StripePaymentIntentResponse>>();

const authHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const fetchPaymentProviders = async (): Promise<PaymentProviderRow[]> => {
  const response = await fetch(paymentProvidersAPI(), {
    headers: authHeaders(),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Payment providers failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  const json = JSON.parse(text) as { data?: PaymentProviderRow[] };
  return json.data ?? [];
};

export const createStripePaymentIntent = async (
  purchaseId: string,
  currency?: string,
): Promise<StripePaymentIntentResponse> => {
  const cacheKey = `${purchaseId}:${currency?.trim().toLowerCase() || ""}`;
  const existing = stripeIntentRequests.get(cacheKey);
  if (existing) return existing;

  const body: { purchaseId: string; currency?: string } = { purchaseId };
  if (currency?.trim()) body.currency = currency.trim().toLowerCase();
  const request = (async () => {
    const response = await fetch(`${purchasesAPI()}/create-payment-intent`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: authHeaders(),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Stripe PaymentIntent failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }
    return JSON.parse(text) as StripePaymentIntentResponse;
  })();

  stripeIntentRequests.set(cacheKey, request);
  request.catch(() => {
    stripeIntentRequests.delete(cacheKey);
  });
  return request;
};

export const finalizeStripePayment = async (purchaseId: string) => {
  const response = await fetch(`${purchasesAPI()}/stripeIsPaymentDone`, {
    method: "POST",
    body: JSON.stringify({ _id: purchaseId }),
    headers: authHeaders(),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Finalize Stripe payment failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  return JSON.parse(text);
};
