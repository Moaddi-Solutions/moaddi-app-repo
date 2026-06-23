import { createContext, useContext, useEffect, useState } from "react";
import { getItem, removeItem, setItem } from "~/lib/utils";

const userContext = createContext(null);
const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getItem("user").then((userData) => {
      if (userData) setUser(userData);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setItem("user", user);
  }, [user]);

  const clearUser = async () => {
    setUser(null);
    await removeItem("user");
  };
  return (
    <userContext.Provider value={{ user, setUser, clearUser, isLoading }}>
      {children}
    </userContext.Provider>
  );
};
const useUser = () => {
  const context = useContext(userContext);
  if (!context)
    throw new Error("useUser must be used within a UserContextProvider");
  return context;
};
export { userContext, UserProvider, useUser };
