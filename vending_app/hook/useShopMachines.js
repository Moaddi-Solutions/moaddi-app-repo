/**
 * The machines a staff user works on inside one shop.
 *
 * The server scopes the shop listing through CASL (`update Machine` ∪
 * `update Box`), so vendor staff, shop admins, and assigned suppliers all
 * receive only the machines they may touch. The client must not re-filter by
 * `vendorId === me` — that would hide machines a supplier is assigned to, and
 * would also break tenant staff whose `_id` is not the parent vendor's.
 */
import { useQuery } from "@tanstack/react-query";
import { useUser } from "~/context/UserContext";
import dataProvider from "~/services/dataProvider";

export const useShopMachines = (shopId) => {
  const { user } = useUser();
  const uid = user?._id ?? "";

  const { data, ...rest } = useQuery({
    queryKey: ["ShopMachines", String(shopId ?? ""), uid],
    queryFn: () =>
      dataProvider.getManyReference("machines", {
        target: "shopId",
        id: shopId,
      }),
    enabled: Boolean(shopId) && Boolean(uid),
    gcTime: 1000 * 60 * 60 * 2,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useShopMachines;
