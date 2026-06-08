/* charts.jsx — «صندوق در یک نگاه». عنوان‌ها نتیجه‌گیری‌اند، نه برچسب.
   بدون کادر و سایه و خطوط راهنمای سنگین؛ برچسب‌گذاری مستقیم. RTL. */

function Panel({ title, children, style = {} }) {
  return (
    <section style={{
      background: 'var(--surface)', border: '1px solid var(--hair)',
      borderRadius: 'var(--radius)', padding: '20px 22px 22px', ...style,
    }}>
      <h3 style={{
        margin: '0 0 16px', fontFamily: 'var(--sans)', fontWeight: 600,
        fontSize: 15, lineHeight: 1.7, color: 'var(--ink)',
        textWrap: 'pretty', maxWidth: '48ch',
      }}>{title}</h3>
      {children}
    </section>
  );
}

/* ---------- ترکیب سرمایه — نمودار حلقه‌ای (دونات) ---------- */
function Composition({ fund }) {
  const { available, outstanding, totalPool } = fund.kpis;
  const isMobile = useIsMobile();
  const availPct = totalPool > 0 ? Math.round((available / totalPool) * 100) : 0;
  const SIZE = isMobile ? 168 : 188;
  const R = isMobile ? 64 : 72;
  const SW = isMobile ? 18 : 20;
  const cx = SIZE / 2;
  const C = 2 * Math.PI * R;
  const dash = (availPct / 100) * C;
  const cap = availPct > 0 && availPct < 100 ? 'round' : 'butt';

  const legendItem = (label, value, color, swatch) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, flex: 'none', ...swatch }} />{label}
      </span>
      <span className="mono" style={{ fontSize: 17, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{fmt(value)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>تومان</span></span>
    </div>
  );

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '8px 0 4px' }}>
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <circle cx={cx} cy={cx} r={R} fill="none" stroke="var(--fill-2)" strokeWidth={SW} />
            <circle cx={cx} cy={cx} r={R} fill="none" stroke="var(--accent)" strokeWidth={SW} strokeLinecap={cap}
              strokeDasharray={`${dash} ${C - dash}`} transform={`rotate(-90 ${cx} ${cx})`} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: isMobile ? 32 : 38, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{faPct(availPct)}٪</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>قابل وام‌دهی</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 0, width: '100%', maxWidth: 360 }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{legendItem('قابل وام‌دهی', available, 'var(--accent)', { background: 'var(--accent)' })}</div>
          <span style={{ width: 1, background: 'var(--hair)', margin: '2px 4px' }} />
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{legendItem('وام داده‌شده', outstanding, 'var(--ink-2)', { background: 'var(--fill-2)', border: '1px solid var(--hair)' })}</div>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { Panel, Composition });
