"use client";

import { dataProviderGenerator } from "@/../services/data-provider";
import { createContext, useContext } from "react";
const DataProviderContext = createContext(undefined);
export function DataProvider({ children }) {
  return (
    <DataProviderContext.Provider value={dataProviderGenerator()}>
      {children}
    </DataProviderContext.Provider>
  );
}
export function useDataProvider() {
  const context = useContext(DataProviderContext);
  if (context === undefined)
    throw new Error("useDataProvider must be used within a DataProvider");
  return context;
}
