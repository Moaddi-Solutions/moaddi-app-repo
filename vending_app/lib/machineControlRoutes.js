/**
 * Customer app: maps vending machine `type` to the locker control screen after checkout.
 * Kept separate from payment screens so importing box UIs does not load Moyasar / WebView.
 */
export const machineControlRoutes = {
  0: "/BoxGrid",
  1: "/BoxGrid",
  2: "/BoxGrid",
  3: "/Bluetooth2Control",
  4: "/Bluetooth4Control",
  5: "/Bluetooth3Control",
  6: "/Bluetooth5Control",
};
