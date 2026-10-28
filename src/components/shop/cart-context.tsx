"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Browser cart.
 *
 * Only product ids and quantities are authoritative. Name/price/image are kept
 * for display and are ALWAYS re-validated on the server at checkout, so a
 * manipulated price in localStorage can never reach an order.
 */
export type CartItem = {
  productId: string;
  quantity: number;
  slug: string;
  name: string;
  priceRwf: number | null;
  imageUrl: string | null;
};

const STORAGE_KEY = "uy_cart_v1";
const MAX_PER_ITEM = 20;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalRwf: number;
  ready: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function sanitise(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      productId: String(entry.productId ?? ""),
      quantity: Math.min(MAX_PER_ITEM, Math.max(1, Number(entry.quantity) || 1)),
      slug: String(entry.slug ?? ""),
      name: String(entry.name ?? ""),
      priceRwf: typeof entry.priceRwf === "number" ? entry.priceRwf : null,
      imageUrl: typeof entry.imageUrl === "string" ? entry.imageUrl : null,
    }))
    .filter((entry) => entry.productId.length > 0)
    .slice(0, 50);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(sanitise(JSON.parse(stored)));
    } catch {
      // Ignore malformed storage and start with an empty cart.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be unavailable (private mode); the cart still works in memory.
    }
  }, [items, ready]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId);
      if (existing) {
        return current.map((entry) =>
          entry.productId === item.productId
            ? { ...entry, quantity: Math.min(MAX_PER_ITEM, entry.quantity + quantity) }
            : entry,
        );
      }
      return [...current, { ...item, quantity: Math.min(MAX_PER_ITEM, Math.max(1, quantity)) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((entry) => entry.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((entry) =>
          entry.productId === productId
            ? { ...entry, quantity: Math.min(MAX_PER_ITEM, Math.max(0, Math.trunc(quantity))) }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, entry) => total + entry.quantity, 0);
    const subtotalRwf = items.reduce(
      (total, entry) => total + (entry.priceRwf ?? 0) * entry.quantity,
      0,
    );
    return { items, itemCount, subtotalRwf, ready, addItem, removeItem, setQuantity, clearCart };
  }, [items, ready, addItem, removeItem, setQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

export { MAX_PER_ITEM };
