"use client";

import type React from "react";

import { hasDashboardSession, notifyAdminLogout } from "@/../lib/auth-session";
import { isDashboardRole, normalizeDashboardRole } from "@/../lib/dashboard-role";
import { getLocalStorageItem, removeLocalStorageItem } from "@/../lib/utils";
import axios from "axios";
import Cookies from "js-cookie";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  isNew: boolean;
  quantity?: number;
};

type CartContextType = {
  cartItems: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  user: object | null;
  isPending: boolean;
  setUser: (user: object | null) => void;
  machine: object | null;
  setMachine: (user: object | null) => void;
  logout: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [user, setUser] = useState<object | null>(null);
  const [machine, setMachine] = useState<object | null>(null);
  const [isPending, setIsPending] = useState<boolean>(true);

  /**
   * Restore shopper session on mount. The cookie is the auth source of truth
   * (it carries the token); localStorage only mirrors the richer profile
   * (name, etc.). So: no cookie => logged out, and a stale localStorage
   * "user" is ignored — this prevents a resurrected session from reappearing
   * after logout. Staff/dashboard cookies are skipped so they never populate
   * the shopper header as a nameless "?" avatar.
   */
  useEffect(() => {
    try {
      const cookie = Cookies.get("user");
      if (cookie) {
        const cookieUser = JSON.parse(cookie) as Record<string, unknown>;
        const role = normalizeDashboardRole(cookieUser.role as string);
        if (!isDashboardRole(role)) {
          const stored = getLocalStorageItem("user");
          const storedUser = stored
            ? (JSON.parse(stored) as Record<string, unknown>)
            : null;
          // Prefer the stored profile for display, but keep the authoritative
          // token + role from the cookie.
          const merged = { ...cookieUser, ...(storedUser ?? {}) };
          merged.token = cookieUser.token;
          merged.role = role;
          setUser(merged);
          if (typeof merged.token === "string") {
            axios.defaults.headers.common.Authorization = `Bearer ${merged.token}`;
          }
        }
      }

      const storedMachine = getLocalStorageItem("machine");
      if (storedMachine) {
        setMachine(JSON.parse(storedMachine) as object);
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setIsPending(false);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems]);

  useEffect(() => {
    // Save shopper profile to localStorage; never wipe admin/vendor sessions.
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else if (!hasDashboardSession()) localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (machine) localStorage.setItem("machine", JSON.stringify(machine));
  }, [machine]);

  const addToCart = useCallback((product: Product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item,
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCartItems((prevItems) => {
      const next = prevItems.filter((item) => item.id !== productId);
      // If cart is empty after removal, clear localStorage
      if (next.length === 0) localStorage.removeItem("cart");
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity < 1) return;

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem("cart");
  }, []);

  /**
   * Authoritative shopper logout. Clears the auth cookie, the mirrored
   * `user`/`machine` storage and the axios header, drops in-memory state,
   * and notifies listeners (e.g. the socket) to tear down. Keeping this in
   * one place stops stale, in-flight `setUser(...)` calls from silently
   * re-persisting the session after the user has signed out.
   */
  const logout = useCallback(() => {
    Cookies.remove("user");
    removeLocalStorageItem("user");
    removeLocalStorageItem("machine");
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
    setMachine(null);
    notifyAdminLogout();
  }, []);

  const totalItems = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0,
  );

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * (item.quantity || 1),
    0,
  );

  // Every useChat()/useCart() consumer in the tree re-renders whenever this
  // value's identity changes. Without this memo, a new object was minted on
  // every CartProvider render, defeating downstream useMemo/useCallback and
  // driving a refetch loop in the chat screens (see chat-context.tsx).
  const value = useMemo<CartContextType>(
    () => ({
      user,
      isPending,
      setUser,
      machine,
      setMachine,
      logout,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    }),
    [
      user,
      isPending,
      machine,
      logout,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
