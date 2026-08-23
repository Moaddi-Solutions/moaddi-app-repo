import { useQuery } from "@tanstack/react-query";
import { useAbility } from "~/context/AbilityContext";
import { useUser } from "~/context/UserContext";
import dataProvider from "~/services/dataProvider";

/**
 * The machines a staff user works on inside one shop.
 *
 *   Shop Admin — every machine on the shop floor, whoever owns it. Their
 *                grant is `manage Machine {shopId: {$in: myShops}}`, so the
 *                vendor is irrelevant to what they may service.
 *   Vendor     — only their own machines in that shop, since their grant is
 *                `update Machine {vendorId: me}`.
 *
 * The distinction matters: the shop-and-vendor endpoint returns nothing at all
 * for an admin, because no machine is assigned to an admin as its vendor.
 */
export const useShopMachines = (shopId) => {
  const { user } = useUser();
  const { capabilities } = useAbility();
  const vendorId = user?._id ?? "";
  const wholeFloor = capabilities.managesShops;

  const { data, ...rest } = useQuery({
    queryKey: ["ShopMachines", String(shopId ?? ""), wholeFloor ? "floor" : vendorId],
    queryFn: () =>
      wholeFloor
        ? dataProvider.getManyReference("machines", { target: "shopId", id: shopId })
        : dataProvider.getManyReferences("machines", [
            // Don't change the order of this array — the provider chains them.
            { target: "shopId", id: shopId },
            { target: "vendorId", id: vendorId },
          ]),
    enabled: Boolean(shopId) && (wholeFloor || Boolean(vendorId)),
    gcTime: 1000 * 60 * 60 * 2,
  });

  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};

export default useShopMachines;
