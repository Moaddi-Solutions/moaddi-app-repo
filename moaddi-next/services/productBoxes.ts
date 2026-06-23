/** In-stock boxes for a machine product (must match MachineProductCard availability). */
export function activeProductBoxes<T extends { isActive?: boolean }>(
  product: { boxes?: T[] } | null | undefined,
): T[] {
  return (product?.boxes ?? []).filter((b) => b.isActive);
}
