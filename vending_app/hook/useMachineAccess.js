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
      ? {
          vendorId: machine.vendorId ?? null,
          shopId: machine.shopId ?? null,
          supplierIds: machine.supplierIds ?? [],
          supportUserId: machine.supportUserId ?? null,
        }
      : null;

    return {
      /** Full machine settings (edit form, assign suppliers, etc.). */
      canManageMachine:
        Boolean(machine) && can(ability, "update", "Machine", owners),
      /**
       * Flip active/inactive. Owners manage the machine; assigned fill staff
       * may toggle too — stocking requires the machine off.
       */
      canToggleMachine:
        Boolean(machine) &&
        (can(ability, "update", "Machine", owners) ||
          can(ability, "update", "Box", owners)),
      /** Assign or clear products in its boxes. */
      canFillBoxes: Boolean(machine) && can(ability, "update", "Box", owners),
    };
  }, [ability, machine]);
};

export default useMachineAccess;
