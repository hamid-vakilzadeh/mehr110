/* charts.jsx — «صندوق در یک نگاه». عنوان‌ها نتیجه‌گیری‌اند، نه برچسب.
   بدون کادر و سایه و خطوط راهنمای سنگین؛ برچسب‌گذاری مستقیم. RTL. */

// Jalali year in Persian digits
const faYear = (g) => new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', year: 'numeric' }).format(new Date(g, 6, 1));

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

/* ---------- ۱. رشد سرمایه — خط واحد، نشانگر فقط روی «امروز» (راست‌چین) ---------- */
function PoolGrowth({ fund }) {
  const g = fund.growth;
  const W = 560, H = 168, padL = 72, padR = 10, padT = 16, padB = 26;
  const ys = g.map((d) => d.pool);
  const maxY = Math.max(...ys);
  // i=0 (قدیمی‌ترین) سمت راست، آخرین (امروز) سمت چپ
  const x = (i) => W - padR - (i / (g.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB);
  const line = g.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.pool).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(g.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;
  const last = g[g.length - 1];
  const li = g.length - 1;

  return (
    <Panel title="سرمایهٔ صندوق هر سال رشد کرده — امروز بزرگ‌تر از همیشه است.">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="poolFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--hair)" strokeWidth="1" />
        <path d={area} fill="url(#poolFade)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(li)} cy={y(last.pool)} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.4" />
        {/* برچسب مستقیم مقدار امروز — سمت چپِ نشانگر */}
        <text x={x(li) - 12} y={y(last.pool) - 6} textAnchor="end" fontFamily="Vazirmatn, sans-serif" fontSize="15" fontWeight="600" fill="var(--accent)">{fmt(last.pool)}</text>
        <text x={x(li) - 12} y={y(last.pool) + 9} textAnchor="end" fontFamily="Vazirmatn, sans-serif" fontSize="10.5" fill="var(--ink-3)">امروز</text>
        {[0, Math.floor(g.length / 2), li].map((i) => (
          <text key={i} x={x(i)} y={H - 8} fontFamily="Vazirmatn, sans-serif" fontSize="11" fill="var(--ink-3)"
            textAnchor={i === 0 ? 'end' : i === li ? 'start' : 'middle'}>{faYear(g[i].year)}</text>
        ))}
      </svg>
    </Panel>
  );
}

/* ---------- ۲. ترکیب سرمایه — نوار افقی ۱۰۰٪ انباشته ---------- */
function Composition({ fund }) {
  const { available, outstanding, totalPool } = fund.kpis;
  const availPct = (available / totalPool) * 100;
  return (
    <Panel title={<>از <Money value={totalPool} /> تومان، <Money value={available} /> تومان هم‌اکنون آمادهٔ وام‌دهی است.</>}>
      <div style={{ display: 'flex', height: 46, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--hair)' }}>
        <div style={{ width: `${availPct}%`, background: 'var(--accent)', minWidth: 2 }} />
        <div style={{ flex: 1, background: 'var(--fill-2)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--accent)' }} />قابل وام‌دهی
          </div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginTop: 3 }}>{fmt(available)}</div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
            وام داده‌شده<span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--fill-2)', border: '1px solid var(--hair)' }} />
          </div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}>{fmt(outstanding)}</div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- ۳. موجودی به تفکیک خانواده — نوار افقی، نزولی ---------- */
function FamilyBars({ fund }) {
  const fams = fund.families;
  const max = fund.derived.topFamilyMax;
  return (
    <Panel title={<>سه خانوادهٔ نخست <strong style={{ fontWeight: 700 }}>{faPct(fund.derived.top3Pct)}٪</strong> از سرمایه را در اختیار دارند.</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {fams.map((f, i) => (
          <div key={f.family} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 64px', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.family}</div>
            <div style={{ height: 14, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(f.balance / max) * 100}%`, height: '100%', background: i < 3 ? 'var(--fill-1)' : 'var(--fill-2)', borderRadius: 4 }} />
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)', textAlign: 'left' }}>{fmt(f.balance)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- ۴. ترتیب وام — فهرست مرتب، «نفر بعدی» برجسته، پیوند به مدیریت ترتیب ---------- */
function RotationQueue({ fund }) {
  const order = fund.loanOrder;
  const next = fund.loanNext;
  const nextIdx = order.findIndex((m) => m.id === next.id);
  const rest = order.slice(nextIdx + 1, nextIdx + 6);
  return (
    <Panel title={<>نوبت وام بعدی با <strong style={{ fontWeight: 700 }}>{next.name}</strong> است.</>}>
      <a href="loan-order.html" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
            background: 'var(--accent-soft)', borderRadius: 9, border: '1px solid var(--accent-line)',
          }}>
            <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--accent)', color: 'var(--surface)', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icon name="star" size={15} stroke={1.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{next.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>خانوادهٔ {next.family}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>نفر بعدی</span>
          </div>
          {rest.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 13px' }}>
              <div className="mono" style={{ width: 26, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', flex: 'none' }}>{fmt(m.loanPos)}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
              {m.loanReceived
                ? <span title="دریافت کرده" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="check" size={13} stroke={2.2} /></span>
                : <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>در انتظار</span>}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', padding: '9px 13px 0', borderTop: '1px solid var(--hair-2)', marginTop: 4 }}>
            <span>دور {faDigits(fund.loanRound)} · {fmt(fund.loanReceivedCount)} از {fmt(fund.loanTotal)} دریافت کرده‌اند</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
              مدیریت ترتیب <Icon name="arrowR" size={14} stroke={1.8} style={{ transform: 'scaleX(-1)' }} />
            </span>
          </div>
        </div>
      </a>
    </Panel>
  );
}

Object.assign(window, { Panel, PoolGrowth, Composition, FamilyBars, RotationQueue });
