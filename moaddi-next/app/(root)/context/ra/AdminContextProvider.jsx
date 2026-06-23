"use client";
import { DataProvider } from "@/(root)/context/ra/DataProviderContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function AdminContextProvider({ children }) {
  const queryClient = new QueryClient();
  return (
    <DataProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataProvider>
  );
}

export default AdminContextProvider;
