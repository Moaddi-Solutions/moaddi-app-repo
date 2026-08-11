import { useMemo } from "react";
import { useAbility } from "~/context/AbilityContext";
import { can } from "~/lib/ability";

/**
 * What the signed-in staff user may do to one machine and its boxes.
 *
 * Checked against the machine document rather than the role, because both
 * ownership rules only resolve against a record: a supplier's is
 * `{vendorId: me}`, a shop admin's is `{shopId: {$in: myShops}}`. Boxes carry
 * the same two columns denormalized from their machine, so the machine's own
 * owners answer for them too.
 *
 * The server enforces all of this independently — this exists so the screen
 * doesn't offer buttons that would come back 403.
 */
export const useMachineAccess = (machine) => {
  const { ability } = useAbility();

  return useMemo(() => {
    const owners = machine
      ? { vendorId: machine.vendorId ?? null, shopId: machine.shopId ?? null }
      : null;

    return {
      /** Toggle the machine on/off, edit its settings. */
      canManageMachine: Boolean(machine) && can(ability, "update", "Machine", owners),
      /** Assign or clear products in its boxes. */
      canFillBoxes: Boolean(machine) && can(ability, "update", "Box", owners),
    };
  }, [ability, machine]);
};

export default useMachineAccess;
