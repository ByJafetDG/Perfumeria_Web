import { supabase } from '../../lib/supabase';

export async function fetchReportsData() {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const { data: rawOrders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .gte('created_at', twelveMonthsAgo)
    .order('created_at', { ascending: true });

  if (ordersErr) throw ordersErr;
  const orders = rawOrders ?? [];

  const validOrders = orders.filter(o => !['cancelled', 'refunded'].includes(o.status));
  const validIds    = validOrders.map(o => o.id);

  // Top fragrances
  let topFragrances = [];
  if (validIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('fragrance_name, brand_name, quantity, subtotal')
      .in('order_id', validIds)
      .not('fragrance_name', 'is', null);

    if (items?.length) {
      const map = {};
      for (const item of items) {
        const k = item.fragrance_name;
        if (!map[k]) map[k] = { name: k, brand: item.brand_name, revenue: 0, qty: 0 };
        map[k].revenue += parseFloat(item.subtotal ?? 0);
        map[k].qty     += item.quantity ?? 0;
      }
      topFragrances = Object.values(map)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }
  }

  // Monthly aggregation (valid orders only)
  const monthlyMap = {};
  for (const o of validOrders) {
    const d   = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { total: 0, count: 0 };
    monthlyMap[key].total += parseFloat(o.total ?? 0);
    monthlyMap[key].count += 1;
  }

  // Build last-12-months array
  const monthly = [];
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({
      key,
      label:     d.toLocaleDateString('es-CR', { month: 'short' }).replace(/\./g, ''),
      labelFull: d.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }),
      total:     monthlyMap[key]?.total ?? 0,
      count:     monthlyMap[key]?.count ?? 0,
    });
  }

  // Status breakdown (all orders, incl. cancelled)
  const statusMap = {};
  for (const o of orders) {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
  }

  // KPIs
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey    = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const curMonth  = monthlyMap[currentKey] ?? { total: 0, count: 0 };
  const prevMonth = monthlyMap[prevKey]    ?? { total: 0, count: 0 };

  const totalRevenue = validOrders.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
  const avgTicket    = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;
  const monthTrend   = prevMonth.total > 0
    ? ((curMonth.total - prevMonth.total) / prevMonth.total) * 100
    : null;

  // Daily-rate projection for current month
  const dayOfMonth  = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyRate   = dayOfMonth > 0 ? curMonth.total / dayOfMonth : 0;
  const rhythmTarget = dailyRate * daysInMonth;

  // Prediction: linear regression on last 6 months
  const prediction = buildPrediction(monthly.slice(6), now);

  return {
    monthly,
    prediction,
    statusMap,
    topFragrances,
    kpis: {
      ventasMes: curMonth.total,
      ordenesMes: curMonth.count,
      avgTicket,
      totalRevenue,
      monthTrend,
      rhythmTarget,
      dailyRate,
    },
  };
}

function buildPrediction(last6, now) {
  const n = last6.length;
  if (n < 2) return [];

  const ys   = last6.map(m => m.total);
  const xs   = ys.map((_, i) => i);
  const sumX  = xs.reduce((a, b) => a + b, 0);
  const sumY  = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumX2 - sumX ** 2;

  const slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  return [1, 2, 3].map(i => {
    const x     = n - 1 + i;
    const total = Math.max(0, intercept + slope * x);
    const d     = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      label:       d.toLocaleDateString('es-CR', { month: 'short' }).replace(/\./g, ''),
      labelFull:   d.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' }),
      total,
      isProjected: true,
    };
  });
}
