import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  fetchWishlistItems,
  addToWishlist,
  removeFromWishlist,
  mergeGuestItems,
} from '../services/wishlist';

const GUEST_KEY = 'perfumero_wishlist';
const loadGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) ?? []; } catch { return []; } };
const saveGuest = items => localStorage.setItem(GUEST_KEY, JSON.stringify(items));

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems]   = useState([]);
  const isLoggedIn = useRef(false);

  // ── Load / switch wishlist on auth change ───────────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const guestItems = loadGuest();

      mergeGuestItems(user.id, guestItems)
        .catch(console.error)
        .finally(() => {
          localStorage.removeItem(GUEST_KEY);
          fetchWishlistItems(user.id)
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

    const refetch = () => fetchWishlistItems(user.id).then(setItems).catch(console.error);

    const channel = supabase
      .channel(`wishlists-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wishlists',
        filter: `user_id=eq.${user.id}`,
      }, refetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ───────────────────────────────────────────────────────
  const toggle = useCallback(product => {
    const wished = items.some(p => p.id === product.id);

    if (isLoggedIn.current) {
      // Optimistic update
      setItems(prev =>
        wished ? prev.filter(p => p.id !== product.id) : [...prev, product]
      );
      const op = wished
        ? removeFromWishlist(user.id, product.id)
        : addToWishlist(user.id, product.id);
      op.catch(err => {
        console.error(err);
        fetchWishlistItems(user.id).then(setItems).catch(console.error);
      });
    } else {
      setItems(prev => {
        const next = wished
          ? prev.filter(p => p.id !== product.id)
          : [...prev, product];
        saveGuest(next);
        return next;
      });
    }
  }, [items, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isWished = useCallback(id => items.some(p => p.id === id), [items]);

  return (
    <WishlistContext.Provider value={{ items, toggle, isWished }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() { return useContext(WishlistContext); }
