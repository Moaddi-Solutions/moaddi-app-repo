import mongoose = require('mongoose');

const Decimal128 = mongoose.Types.Decimal128;
type D = mongoose.Types.Decimal128;

const round = (n: number): number => Math.round(n * 100) / 100;

export const fromNumber = (n: number): D => Decimal128.fromString(round(n).toFixed(2));

export const fromString = (s: string): D => Decimal128.fromString(s);

export const toNumber = (d: D | number | string | null | undefined): number => {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return parseFloat(d.toString());
};

export const add = (a: D | number, b: D | number): D => fromNumber(toNumber(a) + toNumber(b));

export const subtract = (a: D | number, b: D | number): D => fromNumber(toNumber(a) - toNumber(b));

export const multiply = (a: D | number, factor: number): D => fromNumber(toNumber(a) * factor);

export const gte = (a: D | number, b: D | number): boolean => toNumber(a) >= toNumber(b);

export const lt = (a: D | number, b: D | number): boolean => toNumber(a) < toNumber(b);

export const isPositive = (a: D | number): boolean => toNumber(a) > 0;
