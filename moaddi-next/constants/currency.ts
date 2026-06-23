/** Format a numeric price for display; uses suffix style (matches checkout). */
export function formatProductPrice(
  value: unknown,
  currency = "SAR",
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} ${String(currency).toUpperCase()}`;
}
