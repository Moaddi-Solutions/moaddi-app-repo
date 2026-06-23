import { useQuery } from "@tanstack/react-query";
import dataProvider from "~/services/dataProvider";

export const useManyReferences = (resource, references) => {
  const { data, ...rest } = useQuery({
    queryKey: ["ManyReferences", resource, ...references],
    queryFn: () => dataProvider.getManyReferences(resource, references),
    // staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
  return {
    ...rest,
    ...(data && {
      total: data.total,
      items: data.data,
    }),
  };
};
