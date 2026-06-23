import { useQuery } from "@tanstack/react-query";
import dataProvider from "~/services/dataProvider";

export const useGetOne = (resource, id) => {
  const { data, ...rest } = useQuery({
    queryKey: ["GetOne", resource],
    queryFn: () => dataProvider.getOne(resource, { id }),
    // staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
  return {
    ...rest,
    ...(data && {
      item: data.data,
    }),
  };
};
