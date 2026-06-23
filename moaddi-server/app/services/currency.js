const exchangeRatesUrl =
  process.env.EXCHANGE_RATES_URL ?? "https://open.er-api.com/v6/latest/USD";
// Seed with USD so validation and conversions always have a baseline.
let exchangeRates = new Map([["USD", 1]]);
async function updateExchangeRate() {
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
    const data = await response.json();
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
function convertToUSD(amount, fromCurrency) {
  const from = String(fromCurrency || "").trim().toUpperCase();
  if (from === "USD") return amount;
  const rate = exchangeRates.get(from);
  return rate ? amount / rate : amount;
}

function convertFromUSD(amount, toCurrency) {
  const to = String(toCurrency || "").trim().toUpperCase();
  if (to === "USD") return amount;
  const rate = exchangeRates.get(to);
  return rate ? amount * rate : amount;
}

function isValidCurrency(currency) {
  const c = String(currency || "").trim().toUpperCase();
  return !!c && exchangeRates.has(c);
}

function listSupportedCurrencies() {
  return [...exchangeRates.keys()].sort();
}


module.exports = {
  updateExchangeRate,
  convertToUSD,
  convertFromUSD,
  exchangeRates,
  isValidCurrency,
  listSupportedCurrencies,
};

