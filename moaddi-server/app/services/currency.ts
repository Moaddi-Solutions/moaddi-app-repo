const exchangeRatesUrl =
  process.env.EXCHANGE_RATES_URL ?? "https://open.er-api.com/v6/latest/USD";

// Seed with USD so validation and conversions always have a baseline.
export const exchangeRates: Map<string, number> = new Map([["USD", 1]]);

export async function updateExchangeRate(): Promise<void> {
  try {
    // Ensure baseline is always present even if the request fails.
    exchangeRates.set("USD", 1);

    const response = await fetch(exchangeRatesUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      throw new Error("Invalid response from exchange rate API");
    }

    const data = (await response.json()) as { rates?: Record<string, number> };
    const rates = data.rates;
    if (rates) {
      for (const currency of Object.keys(rates)) {
        exchangeRates.set(String(currency).toUpperCase(), rates[currency] ?? 1);
      }
    }
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
  }
}

export function convertToUSD(amount: number, fromCurrency: string): number {
  const from = String(fromCurrency || "")
    .trim()
    .toUpperCase();
  if (from === "USD") return amount;
  const rate = exchangeRates.get(from);
  return rate ? amount / rate : amount;
}

export function convertFromUSD(amount: number, toCurrency: string): number {
  const to = String(toCurrency || "")
    .trim()
    .toUpperCase();
  if (to === "USD") return amount;
  const rate = exchangeRates.get(to);
  return rate ? amount * rate : amount;
}

export function convertToSAR(amount: number, fromCurrency: string): number {
  if (fromCurrency === "SAR") return amount;

  const amountInUSD = convertToUSD(amount, fromCurrency);
  return convertFromUSD(amountInUSD, "SAR");
}
export function isValidCurrency(currency: string): boolean {
  const c = String(currency || "")
    .trim()
    .toUpperCase();
  return !!c && exchangeRates.has(c);
}

export function listSupportedCurrencies(): string[] {
  return [...exchangeRates.keys()].sort();
}
