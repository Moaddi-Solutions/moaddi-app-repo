import { useQuery } from "@tanstack/react-query";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import dataProvider from "~/services/dataProvider";

/**
 * The shops a staff user works in — the two roles reach them differently:
 *
 *   Shop Admin — the shops they administer. `GET /shops` is scoped server-side
 *                to their assigned shop plus any they created, so the plain
 *                list is already the right answer.
 *   Supplier   — the shops their machines stand in, which is a reference
 *                lookup by vendorId, not an administered set. A supplier has
 *                no `update Shop` rule, so the scoped list would be empty.
 *
 * Keying the query on both branches keeps the two caches apart.
 */
export const useStaffShops = () => {
  const { user } = useUser();
  const { capabilities } = useAbility();
  const userId = user?._id ?? "";
  const byAdmin = capabilities.managesShops;

  const { data, ...rest } = useQuery({
    queryKey: ["StaffShops", byAdmin ? "administered" : "byVendor", userId],
    queryFn: () =>
      byAdmin
        ? dataProvider.getList("shops", {
            pagination: { page: 1, perPage: 100 },
            filter: null,
          })
        : dataProvider.getManyReference("shops", {
            target: "vendorId",
            id: userId,
          }),
    enabled: Boolean(userId),
    gcTime: 1000 * 60 * 60 * 2,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useStaffShops;
