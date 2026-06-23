import * as money from './money';

/**
 * When serializing Mongoose docs to JSON, Decimal128 can appear as an object
 * (e.g. `{ $numberDecimal: '12.34' }`), which becomes "[object Object]" in UIs.
 * Coerce to a plain number for API consumers.
 */
export function jsonMoneyField(
  ret: Record<string, unknown>,
  key: string,
): void {
  const v = ret[key];
  if (v == null) return;
  ret[key] = money.toNumber(v as never);
}
