import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  fetchCartItems,
  addCartItem,
  updateCartItemQty,
  deleteCartItem,
  mergeGuestItems,
  getOrCreateCart,
} from '../services/cart';
import { calcEffectivePrice } from '../utils/promoUtils';

const GUEST_KEY = 'perfumero_cart';
const loadGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) ?? []; } catch { return []; } };
const saveGuest = items => localStorage.setItem(GUEST_KEY, JSON.stringify(items));

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems]   = useState([]);
  const isLoggedIn = useRef(false);

  // ── Load / switch cart on auth change ──────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const guestItems = loadGuest();

      // Merge guest cart into Supabase, then fetch full cart
      mergeGuestItems(user.id, guestItems)
        .catch(console.error)
        .finally(() => {
          localStorage.removeItem(GUEST_KEY);
          fetchCartItems(user.id)
            .then(setItems)
            .catch(console.error);
        });

      isLoggedIn.current = true;
    } else {
      isLoggedIn.current = false;
      setItems(loadGuest());
    }
  }, [user?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription (logged-in only) ──────────────────────────
  useEffect(() => {
    if (!user) return;

    let channel = null;
    const refetch = () => fetchCartItems(user.id).then(setItems).catch(console.error);

    getOrCreateCart(user.id).then(cartId => {
      channel = supabase
        .channel(`cart-items-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `cart_id=eq.${cartId}`,
        }, refetch)
        .subscribe();
    }).catch(console.error);

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ───────────────────────────────────────────────────────
  const addItem = useCallback(item => {
    if (isLoggedIn.current) {
      // Optimistic update
      setItems(prev => {
        const exists = prev.find(i => i.cartKey === item.cartKey);
        return exists
          ? prev.map(i => i.cartKey === item.cartKey ? { ...i, qty: i.qty + 1 } : i)
          : [...prev, { ...item, qty: 1 }];
      });
      addCartItem(user.id, item).catch(err => {
        console.error(err);
        // Rollback by re-fetching
        fetchCartItems(user.id).then(setItems).catch(console.error);
      });
    } else {
      setItems(prev => {
        const exists = prev.find(i => i.cartKey === item.cartKey);
        const next = exists
          ? prev.map(i => i.cartKey === item.cartKey ? { ...i, qty: i.qty + 1 } : i)
          : [...prev, { ...item, qty: 1 }];
        saveGuest(next);
        return next;
      });
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateQty = useCallback((cartKey, delta) => {
    setItems(prev => {
      const next = prev.map(i =>
        i.cartKey === cartKey ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      );
      if (isLoggedIn.current) {
        const item = next.find(i => i.cartKey === cartKey);
        if (item?._dbId) {
          updateCartItemQty(item._dbId, item.qty).catch(err => {
            console.error(err);
            fetchCartItems(user.id).then(setItems).catch(console.error);
          });
        }
      } else {
        saveGuest(next);
      }
      return next;
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeItem = useCallback(cartKey => {
    setItems(prev => {
      const item = prev.find(i => i.cartKey === cartKey);
      const next = prev.filter(i => i.cartKey !== cartKey);
      if (isLoggedIn.current) {
        if (item?._dbId) {
          deleteCartItem(item._dbId).catch(err => {
            console.error(err);
            fetchCartItems(user.id).then(setItems).catch(console.error);
          });
        }
      } else {
        saveGuest(next);
      }
      return next;
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearCart = useCallback(async () => {
    if (isLoggedIn.current) {
      const cartId = await getOrCreateCart(user.id);
      await supabase.from('cart_items').delete().eq('cart_id', cartId);
      // Realtime subscription will update items automatically
    } else {
      saveGuest([]);
      setItems([]);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = items.reduce((s, i) => {
    const { subtotal } = calcEffectivePrice(i.price, i.qty, i.promoType, i.discountPct);
    return s + subtotal;
  }, 0);
  const totalDiscount = items.reduce((s, i) => {
    const { discount } = calcEffectivePrice(i.price, i.qty, i.promoType, i.discountPct);
    return s + discount;
  }, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, total, totalDiscount, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
