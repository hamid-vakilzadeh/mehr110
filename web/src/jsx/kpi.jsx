/* kpi.jsx — the "needs attention" alert (only when relevant) + the three
   supporting stat cards (loans / members / shares) shown below the chart. */

/* AttentionCard — the ONLY warning treatment. Hidden entirely when nothing
   is behind on installments. */
function AttentionCard({ fund, onAttention }) {
  const k = fund.kpis;
  if (!k.needsAttention) return null;
  return (
    <div onClick={onAttention} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--warn-soft)', border: '1px solid var(--warn-line)',
      borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer',
      marginBottom: 22, minWidth: 0,
    }}>
      <span style={{ display: 'inline-flex', color: 'var(--warn)', flex: 'none' }}><Icon name="alert" size={20} stroke={1.7} /></span>
      <span className="mono" style={{ fontSize: 30, fontWeight: 600, color: 'var(--warn)', lineHeight: 1, flex: 'none' }}>{fmt(k.needsAttention)}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--warn)' }}>نیازمند توجه</div>
        <div style={{ fontSize: 13, color: 'var(--warn)', marginTop: 2 }}>{fmt(k.needsAttention)} عضو در پرداخت اقساط عقب‌اند</div>
      </div>
    </div>
  );
}

/* StatRow — three equal cards in one row: current loans, members, shares.
   No descriptive sub-line; money value wraps its unit so it never leaks. */
function StatRow({ fund, onMembers }) {
  const k = fund.kpis;
  const card = {
    background: 'var(--surface)', border: '1px solid var(--hair)',
    borderRadius: 'var(--radius)', padding: '18px 20px',
    display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
  };
  const label = { fontSize: 11.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)' };
  const num = { fontSize: 24, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
      <div style={card}>
        <div style={label}>وام‌های جاری</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 5, rowGap: 0, minWidth: 0 }}>
          <span className="mono" style={num}>{fmt(k.outstanding)}</span>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-3)' }}>تومان</span>
        </div>
      </div>
      <div style={{ ...card, cursor: 'pointer' }} onClick={onMembers}>
        <div style={label}>اعضا</div>
        <span className="mono" style={num}>{fmt(k.memberCount)}</span>
      </div>
      <div style={card}>
        <div style={label}>تعداد سهم‌ها</div>
        <span className="mono" style={num}>{fmt(k.totalShares)}</span>
      </div>
    </div>
  );
}

Object.assign(window, { AttentionCard, StatRow });
