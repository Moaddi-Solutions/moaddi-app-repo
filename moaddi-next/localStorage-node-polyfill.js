/**
 * Node may set a broken globalThis.localStorage when NODE_OPTIONS includes
 * --localstorage-file without a valid path (getItem is not a function).
 */
function patchBrokenLocalStorage() {
  if (typeof globalThis === "undefined") return;
  const g = globalThis;
  const ls = g.localStorage;
  if (ls == null || typeof ls !== "object") return;
  if (typeof ls.getItem === "function") {
    try {
      ls.getItem("__moaddi_ls_probe__");
      return;
    } catch {
      /* replace broken implementation */
    }
  }
  const store = new Map();
  g.localStorage = {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

patchBrokenLocalStorage();

module.exports = { patchBrokenLocalStorage };
