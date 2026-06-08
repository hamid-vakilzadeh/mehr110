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
  const availPct = totalPool > 0 ? Math.round((available / totalPool) * 100) : 0;
  const R = 46, C = 2 * Math.PI * R;
  const dash = (availPct / 100) * C;
  const cap = availPct > 0 && availPct < 100 ? 'round' : 'butt';
  return (
    <Panel title={<>از <Money value={totalPool} /> تومان، <Money value={available} /> تومان هم‌اکنون آمادهٔ وام‌دهی است.</>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--fill-2)" strokeWidth="15" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--accent)" strokeWidth="15" strokeLinecap={cap}
              strokeDasharray={`${dash} ${C - dash}`} transform="rotate(-90 60 60)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 25, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{faPct(availPct)}٪</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3 }}>قابل وام‌دهی</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--accent)' }} />قابل وام‌دهی
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginTop: 3 }}>{fmt(available)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>تومان</span></div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--fill-2)', border: '1px solid var(--hair)' }} />وام داده‌شده
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}>{fmt(outstanding)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>تومان</span></div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { Panel, Composition });
