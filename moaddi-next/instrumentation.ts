/**
 * Re-apply for runtimes where globals reset; next.config already required the module once.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  patchBrokenLocalStorage,
} = require("./localStorage-node-polyfill.js");

patchBrokenLocalStorage();

export function register() {
  patchBrokenLocalStorage();
}
