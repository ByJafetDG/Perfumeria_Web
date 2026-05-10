import { create } from 'zustand';

export const useStore = create((set) => ({
  cart: [],
  addItem: (item) =>
    set((state) => ({ cart: [...state.cart, item] })),
  removeItem: (id) =>
    set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
  clearCart: () => set({ cart: [] }),
}));
