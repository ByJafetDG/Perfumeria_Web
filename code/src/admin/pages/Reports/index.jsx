import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { fetchReportsData } from '../../services/reports';
import './Reports.css';

// ── Formatters ──────────────────────────────────────────────────────────────
const formatPrice = n =>
  '¢' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const formatCompact = n => {
  if (n >= 1_000_000) return `¢${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `¢${Math.round(n / 1_000)}k`;
  return `¢${Math.round(n)}`;
};

// ── Status config ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: 'Pendiente',  color: '#F2CA50' },
  confirmed: { label: 'Confirmado', color: '#F2CA50' },
  paid:      { label: 'Pagado',     color: '#4ADE80' },
  shipped:   { label: 'En camino',  color: '#60A5FA' },
  delivered: { label: 'Entregado',  color: '#4ADE80' },
  cancelled: { label: 'Cancelado',  color: '#FFB4AB' },
  refunded:  { label: 'Reembolso',  color: '#FFB4AB' },
};

const STATUS_ORDER = ['delivered', 'paid', 'shipped', 'confirmed', 'pending', 'cancelled', 'refunded'];

// ── Sales Chart ─────────────────────────────────────────────────────────────
function SalesChart({ monthly, prediction, loading }) {
  if (loading) return <div className="ar-chart-sk" />;
  if (!monthly.length) return <p className="ar-empty">Sin datos</p>;

  const CW = 420, CH = 155;
  const PL = 44, PB = 22, PT = 10, PR = 8;
  const cw = CW - PL - PR;
  const ch = CH - PT - PB;

  const recentMonths = monthly.slice(-6);
  const allBars = [...recentMonths, ...prediction];
  const maxVal  = Math.max(...allBars.map(b => b.total), 1);
  const barUnit = cw / allBars.length;
  const barW    = barUnit * 0.52;

  const getBar = val => {
    const h = Math.max((val / maxVal) * ch, val > 0 ? 2 : 0);
    return { h, y: PT + ch - h };
  };

  return (
    <svg
      viewBox={`0 0 ${CW} ${CH}`}
      className="ar-chart-svg"
      aria-hidden="true"
    >
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(pct => {
        const y = PT + ch * (1 - pct);
        return (
          <g key={pct}>
            <line
              x1={PL} y1={y} x2={CW - PR} y2={y}
              stroke="rgba(77,70,53,0.12)" strokeWidth="1"
            />
            <text
              x={PL - 4} y={y + 3.5}
              textAnchor="end" fontSize="7"
              fill="rgba(208,197,175,0.28)"
              fontFamily="Inter,sans-serif"
            >
              {formatCompact(pct * maxVal)}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={PL} y1={PT + ch} x2={CW - PR} y2={PT + ch}
        stroke="rgba(77,70,53,0.25)" strokeWidth="1"
      />

      {/* Divider: real vs projected */}
      {prediction.length > 0 && (
        <line
          x1={PL + recentMonths.length * barUnit}
          y1={PT - 4}
          x2={PL + recentMonths.length * barUnit}
          y2={PT + ch}
          stroke="rgba(242,202,80,0.15)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* Bars */}
      {allBars.map((bar, i) => {
        const { h, y } = getBar(bar.total);
        const x      = PL + i * barUnit + (barUnit - barW) / 2;
        const isProj = !!bar.isProjected;

        return (
          <g key={`bar-${i}`}>
            <rect
              x={x} y={y} width={barW} height={Math.max(h, 1)}
              fill={
                isProj
                  ? 'rgba(242,202,80,0.1)'
                  : bar.total > 0
                    ? '#F2CA50'
                    : 'rgba(77,70,53,0.18)'
              }
              fillOpacity={isProj ? 1 : bar.total > 0 ? 0.88 : 1}
              stroke={isProj ? 'rgba(242,202,80,0.45)' : 'none'}
              strokeWidth={isProj ? '1' : '0'}
              strokeDasharray={isProj ? '3 2' : undefined}
              rx="1"
              className="ar-bar"
              style={{ animationDelay: `${i * 0.055}s` }}
            />
            <text
              x={x + barW / 2} y={PT + ch + 14}
              textAnchor="middle" fontSize="7"
              fill={isProj ? 'rgba(242,202,80,0.42)' : 'rgba(208,197,175,0.38)'}
              fontFamily="Inter,sans-serif"
              fontStyle={isProj ? 'italic' : 'normal'}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [live,    setLive]    = useState('connecting');

  const load = useCallback(async () => {
    try {
      const result = await fetchReportsData();
      setData(result);
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, load)
      .subscribe(status => {
        setLive(status === 'SUBSCRIBED' ? 'live' : 'connecting');
      });

    return () => supabase.removeChannel(channel);
  }, [load]);

  const kpis    = data?.kpis          ?? {};
  const monthly = data?.monthly       ?? [];
  const pred    = data?.prediction    ?? [];
  const statMap = data?.statusMap     ?? {};
  const topFrag = data?.topFragrances ?? [];

  const totalOrders = Object.values(statMap).reduce((s, v) => s + v, 0);

  return (
    <div className="ar-page">

      {/* ── Header ── */}
      <header className="ar-header">
        <h1 className="ar-header__title">Reportes</h1>
        <div className="ar-live">
          <span className={`ar-live__dot${live !== 'live' ? ' ar-live__dot--connecting' : ''}`} />
          {live === 'live' ? 'En vivo' : 'Conectando'}
        </div>
      </header>

      {/* ── KPI Grid ── */}
      <section className="ar-section">
        <p className="ar-section-label">Resumen</p>
        <div className="ar-kpi-grid">

          <div className={`ar-kpi ar-kpi--accent${loading ? ' ar-kpi--sk' : ''}`}>
            {!loading && (
              <>
                <p className="ar-kpi__eyebrow">Ventas · mes</p>
                <p className="ar-kpi__value" style={{ animationDelay: '0s' }}>
                  {formatPrice(kpis.ventasMes ?? 0)}
                </p>
                {kpis.monthTrend != null ? (
                  <p className={`ar-kpi__trend ar-kpi__trend--${kpis.monthTrend >= 0 ? 'up' : 'down'}`}>
                    {kpis.monthTrend >= 0 ? '↑' : '↓'} {Math.abs(kpis.monthTrend).toFixed(1)}% vs mes anterior
                  </p>
                ) : (
                  <p className="ar-kpi__sub">Este mes</p>
                )}
              </>
            )}
          </div>

          <div className={`ar-kpi${loading ? ' ar-kpi--sk' : ''}`}>
            {!loading && (
              <>
                <p className="ar-kpi__eyebrow">Ventas · 12 meses</p>
                <p className="ar-kpi__value ar-kpi__value--sm" style={{ animationDelay: '0.07s' }}>
                  {formatPrice(kpis.totalRevenue ?? 0)}
                </p>
                <p className="ar-kpi__sub">Órdenes válidas</p>
              </>
            )}
          </div>

          <div className={`ar-kpi ar-kpi--green${loading ? ' ar-kpi--sk' : ''}`}>
            {!loading && (
              <>
                <p className="ar-kpi__eyebrow">Ticket promedio</p>
                <p className="ar-kpi__value ar-kpi__value--green ar-kpi__value--sm" style={{ animationDelay: '0.14s' }}>
                  {formatPrice(kpis.avgTicket ?? 0)}
                </p>
                <p className="ar-kpi__sub">Por orden</p>
              </>
            )}
          </div>

          <div className={`ar-kpi ar-kpi--blue${loading ? ' ar-kpi--sk' : ''}`}>
            {!loading && (
              <>
                <p className="ar-kpi__eyebrow">Órdenes · mes</p>
                <p className="ar-kpi__value ar-kpi__value--blue" style={{ animationDelay: '0.21s' }}>
                  {kpis.ordenesMes ?? 0}
                </p>
                <p className="ar-kpi__sub">Este mes</p>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── Sales Chart ── */}
      <section className="ar-section">
        <div className="ar-chart-wrap">
          <div className="ar-chart-top">
            <h2 className="ar-chart-title">Ventas por mes</h2>
            {!loading && (
              <div className="ar-chart-legend">
                <span className="ar-legend-item">
                  <span className="ar-legend-swatch ar-legend-swatch--real" />
                  Real
                </span>
                <span className="ar-legend-item">
                  <span className="ar-legend-swatch ar-legend-swatch--proj" />
                  Estimado
                </span>
              </div>
            )}
          </div>
          <SalesChart monthly={monthly} prediction={pred} loading={loading} />
        </div>
      </section>

      {/* ── Prediction ── */}
      <section className="ar-section">
        <p className="ar-section-label">Proyección de ventas</p>

        {loading ? (
          <div className="ar-pred-grid">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="ar-pred-card ar-pred-card--sk"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : pred.length > 0 ? (
          <>
            <div className="ar-pred-grid">
              {pred.map((p, i) => (
                <div
                  key={p.label}
                  className="ar-pred-card"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <p className="ar-pred-card__month">
                    {p.labelFull.split(' ')[0]}
                  </p>
                  <p className="ar-pred-card__value">{formatPrice(p.total)}</p>
                  <p className="ar-pred-card__tag">estimado</p>
                </div>
              ))}
            </div>

            {kpis.rhythmTarget > 0 && (
              <p className="ar-pred-note">
                Al ritmo actual (<strong>{formatPrice(kpis.dailyRate)}/día</strong>),
                este mes cerraría en{' '}
                <strong>{formatPrice(kpis.rhythmTarget)}</strong>.
                La proyección usa regresión lineal sobre los últimos 6 meses.
              </p>
            )}
          </>
        ) : (
          <p className="ar-empty">Datos insuficientes para proyección (se necesitan al menos 2 meses)</p>
        )}
      </section>

      {/* ── Status Breakdown ── */}
      <section className="ar-section">
        <p className="ar-section-label">Estado de órdenes</p>
        <div className="ar-status-wrap">
          {loading ? (
            [0, 1, 2, 3].map(i => (
              <div key={i} className="ar-sk-row" style={{ animationDelay: `${i * 0.09}s` }} />
            ))
          ) : totalOrders === 0 ? (
            <p className="ar-empty">Sin órdenes</p>
          ) : (
            <div className="ar-status-list">
              {STATUS_ORDER.filter(s => statMap[s] > 0).map((s, idx) => {
                const cfg = STATUS_CFG[s] ?? { label: s, color: '#D0C5AF' };
                const pct = statMap[s] / totalOrders;
                return (
                  <div key={s} className="ar-status-row">
                    <div className="ar-status-row__head">
                      <span className="ar-status-row__name" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="ar-status-row__val">
                        {statMap[s]} · {(pct * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="ar-status-bar">
                      <div
                        className="ar-status-fill"
                        style={{
                          width: `${pct * 100}%`,
                          background: cfg.color,
                          opacity: 0.7,
                          animationDelay: `${idx * 0.07}s`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Top Fragrances ── */}
      <section className="ar-section">
        <p className="ar-section-label">Top fragancias · 12 meses</p>
        <div className="ar-top-wrap">
          {loading ? (
            [0, 1, 2, 3, 4].map(i => (
              <div key={i} className="ar-sk-row" style={{ animationDelay: `${i * 0.07}s` }} />
            ))
          ) : topFrag.length === 0 ? (
            <p className="ar-empty">Sin datos de ventas</p>
          ) : (
            topFrag.map((f, i) => (
              <div
                key={f.name}
                className="ar-top-row"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span className={`ar-top-row__rank${i === 0 ? ' ar-top-row__rank--1' : ''}`}>
                  {i + 1}
                </span>
                <div className="ar-top-row__info">
                  <p className="ar-top-row__name">{f.name}</p>
                  {f.brand && <p className="ar-top-row__brand">{f.brand}</p>}
                </div>
                <div className="ar-top-row__right">
                  <p className="ar-top-row__revenue">{formatPrice(f.revenue)}</p>
                  <p className="ar-top-row__qty">
                    {f.qty} {f.qty === 1 ? 'unidad' : 'unidades'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
