import { useQuery } from "@tanstack/react-query";
import dataProvider from "~/services/dataProvider";

export const useList = (resource, options, filter) => {
  const { data, ...rest } = useQuery({
    queryKey: ["List", resource],
    queryFn: () => dataProvider.getList(resource, options, filter),
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
