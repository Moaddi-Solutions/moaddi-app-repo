import { useQuery } from "@tanstack/react-query";
import { useAbility } from "~/context/AbilityContext";
import dataProvider from "~/services/dataProvider";

/**
 * The staff a shop admin is responsible for.
 *
 * `users/role/Vendor` is scoped server-side by the caller's `update User` rule,
 * so a shop admin gets the suppliers in their shops and nobody else's. A
 * supplier hitting the same endpoint only ever resolves to themselves, which is
 * why the tile is gated on reaching past oneself rather than on the grant.
 */
export const useStaffMembers = () => {
  const { capabilities } = useAbility();

  const { data, ...rest } = useQuery({
    queryKey: ["StaffMembers"],
    queryFn: () =>
      dataProvider.getList("vendors", {
        sort: { field: "name", order: "ASC" },
        pagination: { page: 1, perPage: 200 },
        filter: {},
      }),
    enabled: capabilities.managesStaff,
    gcTime: 1000 * 60 * 30,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useStaffMembers;
