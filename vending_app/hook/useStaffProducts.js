import { useQuery } from "@tanstack/react-query";
import { useAbility } from "~/context/AbilityContext";
import dataProvider from "~/services/dataProvider";

/**
 * The products the signed-in staff user may manage.
 *
 * One query for both roles: the server's `native=true` listing applies the
 * caller's own CASL scope, so a supplier gets their own catalog and a shop
 * admin everything sold in their shops, without the app having to know which
 * of the two it is talking to.
 */
export const useStaffProducts = () => {
  const { capabilities } = useAbility();

  const { data, ...rest } = useQuery({
    queryKey: ["StaffProducts"],
    queryFn: () =>
      dataProvider.getList("staffProducts", {
        sort: { field: "created", order: "DESC" },
        pagination: { page: 1, perPage: 200 },
        filter: {},
      }),
    enabled: capabilities.managesProducts,
    gcTime: 1000 * 60 * 60 * 2,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useStaffProducts;
