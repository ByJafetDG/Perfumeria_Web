export function calcEffectivePrice(price, qty, promoType, discountPct) {
  const original = price * qty;

  switch (promoType) {
    case 'porcentaje': {
      const pct = Number(discountPct);
      if (!pct) return { unitPrice: price, subtotal: original, discount: 0 };
      const discountedUnit = Math.round(price * (1 - pct / 100));
      const sub = discountedUnit * qty;
      return { unitPrice: discountedUnit, subtotal: sub, discount: original - sub };
    }
    case '2x1': {
      const paidQty = Math.ceil(qty / 2);
      const sub = price * paidQty;
      return { unitPrice: price, subtotal: sub, discount: original - sub };
    }
    case '3x2': {
      const freeItems = Math.floor(qty / 3);
      const sub = price * (qty - freeItems);
      return { unitPrice: price, subtotal: sub, discount: price * freeItems };
    }
    default:
      return { unitPrice: price, subtotal: original, discount: 0 };
  }
}
