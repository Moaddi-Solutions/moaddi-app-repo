"use client";

import type React from "react";

import { hasDashboardSession } from "@/../lib/auth-session";
import { normalizeDashboardRole } from "@/../lib/dashboard-role";
import { getLocalStorageItem } from "@/../lib/utils";
import axios from "axios";
// Suppress missing type declarations for js-cookie
// @ts-ignore
import Cookies from "js-cookie";
import { createContext, useContext, useEffect, useState } from "react";

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
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [user, setUser] = useState<object | null>(null);
  const [machine, setMachine] = useState<object | null>(null);
  const [isPending, setIsPending] = useState<boolean>(true);

  /** Restore shopper session from cookie / localStorage so pages are not stuck on isPending. */
  useEffect(() => {
    try {
      const cookie = Cookies.get("user");
      if (cookie) {
        const parsed = JSON.parse(cookie) as Record<string, unknown>;
        parsed.role = normalizeDashboardRole(parsed.role as string);
        setUser(parsed);
        if (typeof parsed.token === "string") {
          axios.defaults.headers.common.Authorization = `Bearer ${parsed.token}`;
        }
      } else {
        const stored = getLocalStorageItem("user");
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, unknown>;
          parsed.role = normalizeDashboardRole(parsed.role as string);
          if (!hasDashboardSession()) setUser(parsed);
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

  const addToCart = (product: Product) => {
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
  };

  const removeFromCart = (productId: number) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId),
    );

    // If cart is empty after removal, clear localStorage
    if (cartItems.length === 1) {
      localStorage.removeItem("cart");
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cart");
  };

  const totalItems = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0,
  );

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * (item.quantity || 1),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        user,
        isPending,
        setUser,
        machine,
        setMachine,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
