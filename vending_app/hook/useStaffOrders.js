import { useQuery } from "@tanstack/react-query";
import { useAbility } from "~/context/AbilityContext";
import dataProvider from "~/services/dataProvider";

/**
 * The orders a staff user may see.
 *
 * The list endpoint applies the caller's own CASL scope, so this asks for no
 * filter: a supplier gets sales from their machines (plus anything they bought
 * themselves), a shop admin their shops' orders.
 */
export const useStaffOrders = () => {
  const { capabilities } = useAbility();

  const { data, ...rest } = useQuery({
    queryKey: ["StaffOrders"],
    queryFn: () =>
      dataProvider.getList("purchases", {
        sort: { field: "created", order: "DESC" },
        pagination: { page: 1, perPage: 100 },
        filter: {},
      }),
    enabled: capabilities.readsOrders,
    gcTime: 1000 * 60 * 30,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useStaffOrders;
