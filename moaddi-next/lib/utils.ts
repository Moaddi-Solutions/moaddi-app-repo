import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const grouped = (items: Array<Record<string, unknown>>, key: string) =>
  Object.entries(
    items.reduce<Record<string, Array<Record<string, unknown>>>>((acc, item) => {
      const { [key]: category, ...rest } = item;
      const categoryKey = String(category ?? "");
      const group = acc[categoryKey] ?? [];
      group.push(rest);
      acc[categoryKey] = group;
      return acc;
    }, {}),
  );

export const chunk = <T,>(array: T[], limit: number) => {
  const result: T[][] = [];
  let resIndex = 0;
  array.forEach((item, i) => {
    if (!(i % limit)) result[resIndex++] = [item];
    else result[resIndex - 1].push(item);
  });
  return result;
};

/** Safe when `localStorage` is missing (SSR) or half-initialized (Node `--localstorage-file`). */
export function getLocalStorageItem(key: string): string | null {
  try {
    const ls = (globalThis as unknown as { localStorage?: Storage })
      .localStorage;
    if (!ls || typeof ls.getItem !== "function") return null;
    return ls.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalStorageItem(key: string, value: string): void {
  try {
    const ls = (globalThis as unknown as { localStorage?: Storage })
      .localStorage;
    if (ls && typeof ls.setItem === "function") ls.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    const ls = (globalThis as unknown as { localStorage?: Storage })
      .localStorage;
    if (ls && typeof ls.removeItem === "function") ls.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const urlToDataUrl = (url: string, contentType = "image/webp") => {
  return fetch(url)
    .then((r) => {
      contentType = r.headers.get("content-type") ?? contentType;
      return r.arrayBuffer();
    })
    .then(
      (b) => `data:${contentType};base64,${Buffer.from(b).toString("base64")}`,
    );
};
