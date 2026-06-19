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

/* loading placeholder mirroring Composition: a donut ring + 2-col legend. */
function ChartSkeleton({ isMobile }) {
  const m = isMobile === undefined ? useIsMobile() : isMobile;
  const SIZE = m ? 168 : 188;
  const HOLE = SIZE - (m ? 36 : 40); // ring thickness = SW*2
  const col = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <Skel width={86} height={12} radius={5} />
      <Skel width={70} height={17} radius={5} />
    </div>
  );
  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '8px 0 4px' }}>
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <Skel width={SIZE} height={SIZE} circle />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: HOLE, height: HOLE, borderRadius: 999, background: 'var(--surface)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', width: '100%', maxWidth: 360 }}>
          {col}
          <span style={{ width: 1, background: 'var(--hair)', margin: '2px 4px' }} />
          {col}
        </div>
      </div>
    </Panel>
  );
}

/* ---------- بودجهٔ سه ماه آینده — درآمد مورد انتظار ماهانه ---------- */
function nextMonthLabels(n) {
  const fmtM = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long' });
  const base = new Date();
  const out = [];
  for (let k = 1; k <= n; k++) out.push(fmtM.format(new Date(base.getFullYear(), base.getMonth() + k, 1)));
  return out;
}

/* Stacked bars: expected monthly income = (active members × membership fee)
   + (installments due that month, i.e. loans that still have ≥k payments left). */
function BudgetChart({ fund }) {
  const fee = fund.settings.membershipFee || 0;
  const activeCount = (fund.members || []).filter((m) => m.status === 'active').length;
  const membership = activeCount * fee;
  const loans = (fund.members || []).filter((m) => m.loan && m.loan.status !== 'repaid').map((m) => m.loan);

  const months = [1, 2, 3].map((k) => {
    const inst = loans.reduce((t, l) => {
      const term = l.termMonths != null ? l.termMonths : (l.term || 0);
      const paid = l.installmentsPaid != null ? l.installmentsPaid : Math.round((l.principal - l.outstanding) / (l.monthly || 1));
      const remaining = Math.max(0, term - paid);
      return t + (remaining >= k ? (l.monthly || 0) : 0);
    }, 0);
    return { membership, inst, total: membership + inst };
  });
  const max = Math.max(1, ...months.map((m) => m.total));
  const labels = nextMonthLabels(3);
  const AREA = 150; // px max bar height

  const swatch = (color, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: 'none' }} />{label}
    </span>
  );

  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 18, height: AREA + 28, padding: '14px 6px 0' }}>
        {months.map((m, i) => {
          const h = Math.round((m.total / max) * AREA);
          const memH = m.total > 0 ? Math.round((m.membership / m.total) * h) : 0;
          const instH = Math.max(0, h - memH);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{fmt(m.total)}</span>
              <div style={{ width: 48, height: AREA, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: h, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--surface-2)' }}>
                  <div style={{ height: instH, background: 'var(--fill-1)' }} title="اقساط" />
                  <div style={{ height: memH, background: 'var(--accent)' }} title="حق عضویت" />
                </div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hair-2)' }}>
        {swatch('var(--accent)', 'حق عضویت')}
        {swatch('var(--fill-1)', 'اقساط وام')}
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>تومان در ماه</span>
      </div>
    </Panel>
  );
}

Object.assign(window, { Panel, Composition, ChartSkeleton, BudgetChart });
