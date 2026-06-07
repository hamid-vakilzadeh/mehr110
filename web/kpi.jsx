/* kpi.jsx — KPI band. Hero = Total seed pool (top-left, biggest).
   The ONLY warning treatment in the band is the "Needs attention" tile. */

function Tile({ label, children, sub, area, hero, warn, onClick }) {
  return (
    <div onClick={onClick} style={{
      gridArea: area,
      background: warn ? 'var(--warn-soft)' : 'var(--surface)',
      border: `1px solid ${warn ? 'var(--warn-line)' : 'var(--hair)'}`,
      borderRadius: 'var(--radius)',
      padding: hero ? '26px 28px' : '18px 20px',
      display: 'flex', flexDirection: 'column',
      justifyContent: hero ? 'space-between' : 'flex-start',
      gap: hero ? 0 : 7,
      cursor: onClick ? 'pointer' : 'default',
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: warn ? 'var(--warn)' : 'var(--ink-3)',
      }}>
        {warn && <Icon name="alert" size={15} stroke={1.7} />}
        {label}
      </div>
      {children}
      {sub && <div style={{ fontSize: hero ? 14 : 12.5, color: warn ? 'var(--warn)' : 'var(--ink-3)', lineHeight: 1.4, fontWeight: warn ? 500 : 400 }}>{sub}</div>}
    </div>
  );
}

function KpiBand({ fund, onAttention, onMembers }) {
  const k = fund.kpis;
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: 'grid', gap: isMobile ? 12 : 14,
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(12, 1fr)',
      gridTemplateAreas: isMobile
        ? `"hero hero" "avail need" "loan loan" "mem shr"`
        : `
        "hero hero hero hero avail avail avail avail need need need need"
        "hero hero hero hero loan loan loan mem mem mem shr shr"`,
    }}>
      {/* HERO */}
      <Tile area="hero" hero label="سرمایهٔ کل صندوق">
        <div style={{ marginTop: isMobile ? 10 : 18 }}>
          <Money value={k.totalPool} unit="تومان" style={{ fontSize: isMobile ? 40 : 56, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.1 }} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? 14 : 17, color: 'var(--ink-2)', marginTop: isMobile ? 10 : 16, maxWidth: '28ch', lineHeight: 1.7 }}>
            همهٔ آنچه خانواده از سال ۱۳۹۶ تاکنون با هم پس‌انداز کرده است.
          </div>
        </div>
      </Tile>

      {/* AVAILABLE — عدد تصمیم‌گیری */}
      <Tile area="avail" label="قابل وام‌دهی" sub="سرمایه منهای وام‌های جاری — آمادهٔ وام‌دهی امروز">
        <Money value={k.available} style={{ fontSize: 38, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.1 }} />
      </Tile>

      {/* NEEDS ATTENTION — تنها هشدار در نوار */}
      <Tile area="need" warn label="نیازمند توجه" sub={`${fmt(k.needsAttention)} عضو در پرداخت اقساط عقب‌اند`} onClick={onAttention}>
        <span className="mono" style={{ fontSize: 38, fontWeight: 600, color: 'var(--warn)', lineHeight: 1.1 }}>{fmt(k.needsAttention)}</span>
      </Tile>

      {/* supporting row */}
      <Tile area="loan" label="وام‌های جاری" sub={`${fmt(k.activeLoans)} وام فعال`}>
        <Money value={k.outstanding} style={{ fontSize: 27, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }} />
      </Tile>
      <Tile area="mem" label="اعضا" sub={`در ${fmt(k.familiesCount)} خانواده`} onClick={onMembers}>
        <span className="mono" style={{ fontSize: 27, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>{fmt(k.memberCount)}</span>
      </Tile>
      <Tile area="shr" label="تعداد سهم‌ها" sub="خطوط مشارکت">
        <span className="mono" style={{ fontSize: 27, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>{fmt(k.totalShares)}</span>
      </Tile>
    </div>
  );
}

Object.assign(window, { KpiBand });
