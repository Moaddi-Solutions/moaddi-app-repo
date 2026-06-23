import { useQuery } from "@tanstack/react-query";
import { getRequest } from "~/services/httpClient";
import { purchaseAPI } from "~/services/serverAddresses";

export const useInvoice = (invoiceId) => {
  return useQuery({
    queryKey: ["invoiceId", invoiceId],
    queryFn: () => getRequest(purchaseAPI(`invoiceData/${invoiceId}`)),
    // staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
};
