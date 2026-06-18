/* purchasing.jsx — «سهم‌های در حال خرید»: ردیاب خرید سهم جدید با نوار پیشرفت.
   اعضایی که بهای سهم تازه را قسطی می‌پردازند. */

function PurchaseCard({ m }) {
  const p = m.pendingShare;
  return (
    <a href={`statement.html?m=${m.id}`} style={{
      textDecoration: 'none', color: 'inherit',
      background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>خانوادهٔ {m.family} · {p.label} · در حال تأمین</div>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="arrowUpRight" size={16} stroke={1.7} />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{faPct(p.pct)}٪</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }} className="mono">{fmt(p.paid)} / {fmt(p.target)}</span>
        </div>
        <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${p.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
          <span className="mono">{fmt(p.remaining)}</span> تومان تا تأمین کامل سهم‌ها
        </div>
      </div>
    </a>
  );
}

function PurchaseTracker({ fund, isMobile }) {
  const list = fund.purchasing;
  const agg = fund.purchaseAgg;
  if (!list.length) return null;
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '40px 0 6px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>سهم‌های در حال تأمین</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: '74ch' }}>
        {fmt(agg.count)} عضو در حال تأمین پس‌انداز سهم‌های خود هستند (حداقل هر سهم {fmt(agg.price)} تومان).
        تاکنون <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmt(agg.paid)}</span> از
        <span className="mono" style={{ fontWeight: 600 }}> {fmt(agg.target)}</span> تومان تأمین شده است.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14 }}>
        {list.map((m) => <PurchaseCard key={m.id} m={m} />)}
      </div>
    </section>
  );
}

Object.assign(window, { PurchaseTracker });
