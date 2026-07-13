import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { getItem, removeItem, setItem } from "~/lib/utils";

export type AppUser = {
  _id?: string;
  name?: string;
  role?: string;
  token?: string;
  phone?: string;
  email?: string;
  preferredCurrency?: string;
  isGuest?: boolean;
  [key: string]: unknown;
};

type UserContextValue = {
  user: AppUser | null;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  clearUser: () => Promise<void>;
  isLoading: boolean;
  isGuest: boolean;
};

const userContext = createContext<UserContextValue | null>(null);

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getItem("user").then((userData) => {
      if (userData) setUser(userData as AppUser);
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
  const isGuest = user?.role === "Guest";
  return (
    <userContext.Provider
      value={{ user, setUser, clearUser, isLoading, isGuest }}
    >
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
