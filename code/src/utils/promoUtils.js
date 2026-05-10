/**
 * Calcula el precio efectivo de un item aplicando la promo activa.
 * Retorna { unitPrice, subtotal, discount }.
 * - porcentaje: descuento directo sobre unit_price
 * - 2x1: cada 2 unidades pagas 1
 * - 3x2: cada 3 unidades pagas 2
 * - resto: sin cambio
 */
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

export const PROMO_COLORS = {
  porcentaje:      { color: '#F2CA50', bg: 'rgba(242,202,80,0.18)'  },
  '2x1':           { color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
  '3x2':           { color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
  precio_especial: { color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  envio_gratis:    { color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
  regalo:          { color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
};

export function getPromoLabel(promoType, discountPct, promoValue) {
  switch (promoType) {
    case 'porcentaje':      return discountPct ? `−${discountPct}%` : null;
    case '2x1':             return '2×1';
    case '3x2':             return '3×2';
    case 'precio_especial': return promoValue  ?? 'Precio especial';
    case 'envio_gratis':    return 'Envío gratis';
    case 'regalo':          return 'Regalo incluido';
    default:                return null;
  }
}
