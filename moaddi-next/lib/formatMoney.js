/**
 * Renders API money fields that may be number, string, Decimal128 JSON, or plain objects.
 * Always returns a string fixed to 2 decimal places (e.g. "0.00", "12.50").
 */
export function formatMoneyValue(v) {
  return formatNumberValue(v, "0.00");
}

/**
 * Extracts the raw scalar out of API number fields that may be number, string,
 * Decimal128 JSON ({ $numberDecimal }), or plain objects.
 */
function extractRaw(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.$numberDecimal != null) return v.$numberDecimal;
    const s = v.toString?.();
    if (typeof s === "string" && s !== "[object Object]") return s;
  }
  return null;
}

/**
 * Formats any number-ish value to 2 decimal places. Falls back to `fallback`
 * when the value is missing or not numeric.
 */
export function formatNumberValue(v, fallback = "0.00") {
  const raw = extractRaw(v);
  if (raw == null) return fallback;
  const n = Number(raw);
  if (Number.isFinite(n)) return n.toFixed(2);
  return typeof raw === "string" ? raw : fallback;
}
