import { useStore } from '../store';

export function useCart() {
  const cart = useStore((s) => s.cart);
  const addItem = useStore((s) => s.addItem);
  const removeItem = useStore((s) => s.removeItem);
  const clearCart = useStore((s) => s.clearCart);

  return { cart, addItem, removeItem, clearCart };
}
