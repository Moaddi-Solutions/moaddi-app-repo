import { machineControlRoutes } from "~/lib/machineControlRoutes";

/**
 * After a payment is confirmed, point the box-open screen at the paid purchase
 * and navigate to it — BoxGrid for direct/networked machines, BluetoothXControl
 * for Bluetooth ones. This mirrors the My Fatoora `Checkout.jsx` flow so every
 * provider lands on the same open/gift screen instead of a dead-end success page.
 *
 * `response` is the server payment-done payload:
 * `{ _id, machineId, machine, boxes, status }` (see orchestrator PaymentResponse).
 */
export function goToOpenAfterPayment(response, { setUser, setMachine, router }) {
  const machine = response?.machine ?? null;
  const boxes = response?.boxes ?? [];
  const route = machineControlRoutes[machine?.type] ?? "/BoxGrid";

  // Seed the machine context; BoxGrid filters boxes by the active machine's id.
  if (machine && setMachine) setMachine(machine);

  setUser((prev) => ({
    ...(prev || {}),
    purchase: {
      ...(prev?.purchase || {}),
      _id: response?._id ?? prev?.purchase?._id,
      // Buyer id when the payload carries it; BoxGrid treats an unknown
      // customerId as "current user is the buyer" (true for checkout).
      customerId: response?.customerId ?? prev?.purchase?.customerId,
      machineId: response?.machineId ?? prev?.purchase?.machineId,
      status: response?.status,
      boxes,
      machine,
      controlRoute: route,
    },
  }));

  router.replace(route);
}
