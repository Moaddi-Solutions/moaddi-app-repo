import { useQuery } from "@tanstack/react-query";
import dataProvider from "~/services/dataProvider";

export const useManyReference = (resource, { target, id }) => {
  const { data, ...rest } = useQuery({
    queryKey: ["ManyReference", resource, target, id],
    queryFn: () =>
      dataProvider.getManyReference(resource, {
        id,
        target,
      }),
    enabled: Boolean(id),
    // staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
  return {
    ...rest,
    total: data?.total ?? 0,
    items: data?.data ?? [],
  };
};
