import { useQuery } from "@tanstack/react-query";
import dataProvider from "~/services/dataProvider";

// `options` is spread into useQuery so callers can pass react-query flags such as
// `enabled` — needed when the id is only known after a parent has loaded.
export const useGetOne = (resource, id, options) => {
  const { data, ...rest } = useQuery({
    // `id` must be part of the key: without it every record of a resource shares
    // one cache entry, so opening a second vendor/machine reads back the first
    // one's data and lookups against it silently return nothing.
    queryKey: ["GetOne", resource, id],
    queryFn: () => dataProvider.getOne(resource, { id }),
    // staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    ...options,
  });
  return {
    ...rest,
    ...(data && {
      item: data.data,
    }),
  };
};
