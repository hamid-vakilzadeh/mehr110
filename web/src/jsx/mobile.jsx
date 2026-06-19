/* mobile.jsx — نمای موبایل (راست‌چین): کاشی‌های تک‌ستونی + اعضا به‌صورت کارت. */

const SAFE_TOP = 58, SAFE_BOT = 34;

function MHeader() {
  const fund = window.FUND;
  return (
    <div style={{ padding: '0 18px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="banknote" size={18} stroke={1.6} style={{ color: 'var(--surface)' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 20, color: 'var(--ink)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>صندوق مهر۱۱۰</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>تا {fund.meta.asOf}</div>
        </div>
      </div>
    </div>
  );
}

function MTile({ label, children, sub, warn }) {
  return (
    <div style={{
      background: warn ? 'var(--warn-soft)' : 'var(--surface)',
      border: `1px solid ${warn ? 'var(--warn-line)' : 'var(--hair)'}`,
      borderRadius: 13, padding: '13px 15px', flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: warn ? 'var(--warn)' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
        {warn && <Icon name="alert" size={12} stroke={1.8} />}{label}
      </div>
      <div style={{ marginTop: 7 }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: warn ? 'var(--warn)' : 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MobileOverview() {
  const fund = window.FUND, k = fund.kpis;
  const availPct = (k.available / k.totalPool) * 100;
  const next = fund.queue[0];
  return (
    <div className="scroll-y" style={{ height: '100%', overflowY: 'auto', background: 'var(--paper)', paddingTop: SAFE_TOP, paddingBottom: SAFE_BOT }}>
      <MHeader />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* hero */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, padding: '17px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)' }}>سرمایهٔ کل صندوق</div>
          <Money value={k.totalPool} unit="تومان" style={{ fontSize: 40, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.15, display: 'block', marginTop: 8 }} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-2)', marginTop: 9, lineHeight: 1.6 }}>همهٔ آنچه خانواده از سال ۱۳۹۶ پس‌انداز کرده است.</div>
        </div>
        {/* available + needs attention */}
        <div style={{ display: 'flex', gap: 11 }}>
          <MTile label="قابل وام‌دهی" sub="آمادهٔ وام‌دهی امروز">
            <Money value={k.available} style={{ fontSize: 23, fontWeight: 600, color: 'var(--accent)' }} />
          </MTile>
          <MTile label="نیازمند توجه" warn sub="عقب در پرداخت">
            <span className="mono" style={{ fontSize: 23, fontWeight: 600, color: 'var(--warn)' }}>{fmt(k.needsAttention)}</span>
          </MTile>
        </div>
        {/* out on loan + members + shares */}
        <div style={{ display: 'flex', gap: 11 }}>
          <MTile label="وام‌های جاری" sub={`${fmt(k.activeLoans)} وام`}>
            <Money value={k.outstanding} style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)' }} />
          </MTile>
          <MTile label="اعضا" sub={`${fmt(k.familiesCount)} خانواده`}>
            <span className="mono" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>{fmt(k.memberCount)}</span>
          </MTile>
          <MTile label="سهم‌ها" sub="مشارکت">
            <span className="mono" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>{fmt(k.totalShares)}</span>
          </MTile>
        </div>
        {/* composition */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, padding: '15px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 11, lineHeight: 1.6 }}>
            از <Money value={k.totalPool} /> تومان، <Money value={k.available} /> تومان آمادهٔ وام‌دهی است.
          </div>
          <div style={{ display: 'flex', height: 38, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hair)' }}>
            <div style={{ width: `${availPct}%`, background: 'var(--accent)' }} />
            <div style={{ flex: 1, background: 'var(--fill-2)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 11.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-2)', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />قابل وام‌دهی</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-3)', fontWeight: 600 }}>وام داده‌شده<span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--fill-2)', border: '1px solid var(--hair)' }} /></span>
          </div>
        </div>
        {/* next up */}
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--accent)', color: 'var(--surface)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="star" size={16} stroke={1.4} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)' }}>نوبت دریافت بعدی</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 1 }}>{next.name}</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'left' }}>{fmt(fund.queue.length)} در انتظار</div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ m }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--hair)',
      borderRadius: 13, padding: '13px 15px',
      boxShadow: m.behind ? 'inset -3px 0 0 var(--warn)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {m.behind && <Icon name="alert" size={15} stroke={1.7} style={{ color: 'var(--warn)' }} />}
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{m.name}</span>
        <Icon name="banknote" size={14} style={{ color: m.loan ? 'var(--accent)' : 'var(--ink-3)' }} />
        <Icon name="chevron" size={15} style={{ color: 'var(--ink-3)' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
        خانوادهٔ {m.family} · از {m.sinceLabel}{m.behind && <span style={{ color: 'var(--warn)', fontWeight: 600 }}> · {fmt(m.missed)} قسط عقب</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--hair-2)' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)' }}>
          <span><span className="mono" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt(m.nShares)}</span> سهم</span>
          <span><span className="mono" style={{ color: m.fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)', fontWeight: 600 }}>{faPct(m.fundedPct)}٪</span> تأمین</span>
        </div>
        <Money value={m.seedBalance} unit="تومان" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }} />
      </div>
    </div>
  );
}

function MobileMembers() {
  const fund = window.FUND;
  const shown = fund.members.slice(0, 8);
  return (
    <div className="scroll-y" style={{ height: '100%', overflowY: 'auto', background: 'var(--paper)', paddingTop: SAFE_TOP, paddingBottom: SAFE_BOT }}>
      <div style={{ padding: '0 18px 12px' }}>
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 24, color: 'var(--ink)', lineHeight: 1.3 }}>همهٔ اعضا</div>
        {/* search */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <div style={{ height: 38, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', display: 'flex', alignItems: 'center', paddingRight: 36, fontSize: 14, color: 'var(--ink-3)' }}>جستجوی اعضا…</div>
        </div>
      </div>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map((m) => <MemberCard key={m.id} m={m} />)}
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', padding: '6px 0 4px' }}>+ {fmt(fund.members.length - shown.length)} عضو دیگر</div>
      </div>
    </div>
  );
}

function MobilePage() {
  return (
    <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
      {[['نمای کلی', <MobileOverview key="o" />], ['اعضا — به‌صورت کارت', <MobileMembers key="m" />]].map(([label, screen]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <IOSDevice width={390} height={844}>{screen}</IOSDevice>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MobilePage />);
