// "use client";
// import dataProvider from "@/../services/data-provider";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { AdminRouter, DataProviderContext } from "react-admin";

// function AdminContext({ children }) {
//   const queryClient = new QueryClient();
//   //   const content =
//   //     typeof window === "undefined" ? (
//   //       children
//   //     ) : (
//   //       <AdminRouter basename="">{children}</AdminRouter>
//   //     );
//   return (
//     <DataProviderContext.Provider value={dataProvider}>
//       <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
//     </DataProviderContext.Provider>
//   );
// }

// export default AdminContext;
