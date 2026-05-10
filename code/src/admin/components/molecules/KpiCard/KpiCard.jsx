import { useState, useEffect, useRef } from 'react';
import './KpiCard.css';

function getChangedDigitPositions(oldStr, newStr) {
  const digitPos = (s) => {
    const pos = [];
    for (let i = 0; i < s.length; i++) {
      if (/\d/.test(s[i])) pos.push(i);
    }
    return pos;
  };

  const newPos = digitPos(newStr);
  const oldPos = digitPos(oldStr);
  const changed = new Set();

  for (let r = 0; r < newPos.length; r++) {
    const ni = newPos[newPos.length - 1 - r];
    const oi = oldPos[oldPos.length - 1 - r];
    if (oi === undefined || newStr[ni] !== oldStr[oi]) {
      changed.add(ni);
    }
  }

  return changed;
}

function SlotValue({ value, color }) {
  const str = String(value);
  const prevRef = useRef(str);
  const [animToken, setAnimToken] = useState({ changed: new Set(), id: 0 });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === str) return;
    const changed = getChangedDigitPositions(prev, str);
    setAnimToken(t => ({ changed, id: t.id + 1 }));
    prevRef.current = str;
  }, [str]);

  return (
    <p className="kpi-card__value" style={{ color }}>
      {Array.from(str).map((char, i) => {
        const isAnimated = animToken.changed.has(i);
        return (
          <span key={i} className="kpi-card__digit-clip">
            <span
              key={isAnimated ? `${i}-${animToken.id}` : `${i}-s`}
              className={isAnimated ? 'kpi-card__digit kpi-card__digit--slot' : 'kpi-card__digit'}
            >
              {char}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export default function KpiCard({ icon, iconBg, label, value, valueColor, gradient, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick}>
      <div className="kpi-card__icon-wrap" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="kpi-card__body">
        <p className="kpi-card__label">{label}</p>
        <SlotValue value={value} color={valueColor} />
      </div>
      {gradient && (
        <div className="kpi-card__gradient" style={{ background: gradient }} />
      )}
    </div>
  );
}
