/* loanorder.jsx — مدیریت ترتیب وام‌گیرندگان (دور به دور).
   هر عضو سرِ جای خود می‌ماند و فقط «دریافت‌کرده» علامت می‌خورد — هرگز به ته فهرست نمی‌رود.
   نفر بعدی = نخستین عضوی که هنوز در این دور وام نگرفته. وقتی همه گرفتند، دور تازه آغاز می‌شود. */

function LoanOrder() {
  const fund = window.FUND;
  const isMobile = useIsMobile();
  const [order, setOrder] = React.useState(() => fund.loanOrder.map((m) => ({
    id: m.id, name: m.name, family: m.family, received: m.loanReceived,
  })));
  const [round, setRound] = React.useState(fund.loanRound);
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const [saved, setSaved] = React.useState(false);
  const [confirmRound, setConfirmRound] = React.useState(false);

  const receivedCount = order.filter((m) => m.received).length;
  const total = order.length;
  const allReceived = total > 0 && receivedCount === total;
  const nextId = (order.find((m) => !m.received) || {}).id;

  const move = (from, to) => {
    if (from === to) return;
    setOrder((arr) => {
      const next = arr.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
    setSaved(false);
  };

  const onDrop = (targetId) => {
    const from = order.findIndex((m) => m.id === dragId);
    const to = order.findIndex((m) => m.id === targetId);
    if (from > -1 && to > -1) move(from, to);
    setDragId(null); setOverId(null);
  };

  const bump = (id, dir) => {
    const i = order.findIndex((m) => m.id === id);
    move(i, Math.max(0, Math.min(order.length - 1, i + dir)));
  };

  const toggleReceived = (id) => {
    const cur = order.find((m) => m.id === id);
    const nv = cur ? !cur.received : true;
    setOrder((arr) => arr.map((m) => (m.id === id ? { ...m, received: nv } : m)));
    setSaved(false);
    if (window.API && window.API.live) window.API.markReceived(id, nv).catch((e) => console.error(e));
  };

  const doStartNewRound = () => {
    if (window.API && window.API.live) window.API.startNewRound().catch((e) => console.error(e));
    setOrder((arr) => arr.map((m) => ({ ...m, received: false })));
    setRound((r) => r + 1);
    setSaved(false);
    setConfirmRound(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '20px 16px 70px' : '28px 24px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 10 }}>
            <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
          </a>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 27, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>ترتیب وام‌گیرندگان</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.7, maxWidth: '60ch' }}>
            با کشیدن هر ردیف، ترتیب نوبت وام را تغییر دهید. اعضای دریافت‌کرده سرِ جای خود می‌مانند و فقط علامت می‌خورند.
          </p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="grip" size={22} stroke={1.6} style={{ color: 'var(--surface)' }} />
        </div>
      </div>

      {/* round progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>دور</span>
          <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{faDigits(round)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}>
            <span>{fmt(receivedCount)} از {fmt(total)} عضو در این دور وام گرفته‌اند</span>
            <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{faPct(total ? Math.round((receivedCount / total) * 100) : 0)}٪</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${total ? (receivedCount / total) * 100 : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* all-received banner */}
      {allReceived && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 16 }}>
          <Icon name="check" size={18} stroke={2.2} style={{ color: 'var(--accent)' }} />
          <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>همهٔ اعضا در این دور وام گرفته‌اند. می‌توانید دور تازه را آغاز کنید.</div>
          <button onClick={() => setConfirmRound(true)} style={{ height: 38, padding: '0 16px', borderRadius: 9, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <Icon name="refresh" size={15} stroke={1.8} /> شروع دور جدید
          </button>
        </div>
      )}

      {/* reorderable list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {order.length === 0 && (
          <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.9 }}>
            هنوز عضوی اضافه نشده است. پس از افزودن اعضا، ترتیب وام‌گیرندگان را اینجا می‌چینید.
          </div>
        )}
        {order.map((m, i) => {
          const isNext = m.id === nextId;
          const isOver = overId === m.id && dragId !== m.id;
          return (
            <div key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragEnter={() => setOverId(m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(m.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderBottom: i < order.length - 1 ? '1px solid var(--hair-2)' : 'none',
                background: isOver ? 'var(--accent-soft)' : isNext ? 'var(--accent-soft)' : dragId === m.id ? 'var(--surface-2)' : 'transparent',
                boxShadow: isNext ? 'inset 3px 0 0 var(--accent)' : 'none',
                opacity: dragId === m.id ? 0.5 : 1, cursor: 'grab', transition: 'background .12s ease',
              }}>
              <span style={{ color: 'var(--ink-3)', display: 'inline-flex', flex: 'none' }}><Icon name="grip" size={18} /></span>
              <span className="mono" style={{ width: 26, textAlign: 'center', fontSize: 13, fontWeight: 600, color: isNext ? 'var(--accent)' : 'var(--ink-3)', flex: 'none' }}>{faDigits(i + 1)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.name}
                  {isNext && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>نفر بعدی</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>خانوادهٔ {m.family}</div>
              </div>
              {/* received toggle */}
              <button onClick={() => toggleReceived(m.id)} title={m.received ? 'دریافت کرده' : 'در انتظار'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 99,
                border: `1px solid ${m.received ? 'var(--accent-line)' : 'var(--hair)'}`, cursor: 'pointer',
                background: m.received ? 'var(--accent-soft)' : 'var(--surface)', font: 'inherit',
                fontSize: 12, fontWeight: 600, color: m.received ? 'var(--accent)' : 'var(--ink-3)', whiteSpace: 'nowrap', flex: 'none',
              }}>
                <Icon name={m.received ? 'check' : 'clock'} size={13} stroke={2} />
                {m.received ? 'دریافت کرده' : 'در انتظار'}
              </button>
              {/* up/down on mobile (drag fallback) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none' }}>
                <button onClick={() => bump(m.id, -1)} disabled={i === 0} style={arrowBtn(i === 0)}><Icon name="sortUp" size={13} stroke={2} /></button>
                <button onClick={() => bump(m.id, 1)} disabled={i === order.length - 1} style={arrowBtn(i === order.length - 1)}><Icon name="sortDn" size={13} stroke={2} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: saved ? 'var(--accent)' : 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {saved && <Icon name="check" size={14} stroke={2.2} />}{saved ? 'ترتیب ذخیره شد' : 'تغییرات ذخیره‌نشده'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmRound(true)} style={{ height: 44, padding: '0 18px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="refresh" size={16} stroke={1.8} /> شروع دور جدید
          </button>
          <button onClick={() => {
            if (window.API && window.API.live) {
              window.API.reorderLoanOrder(order.map((m) => m.id)).then(() => setSaved(true)).catch((e) => alert('خطا در ذخیره ترتیب: ' + (e && e.message ? e.message : e)));
            } else { setSaved(true); }
          }} style={{ height: 44, padding: '0 24px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <Icon name="check" size={17} stroke={2} /> ثبت ترتیب
          </button>
        </div>
      </div>

      {confirmRound && (
        <div onClick={() => setConfirmRound(false)} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.01 65 / 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '26px 28px', maxWidth: 420, width: '100%', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="refresh" size={20} stroke={1.8} /></div>
              <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>شروع دور جدید؟</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.8 }}>
              با شروع دور جدید، وضعیت «دریافت‌کرده» همهٔ اعضا صفر می‌شود و شماره دور به {faDigits(round + 1)} می‌رسد. ترتیب اعضا حفظ می‌شود. این کار قابل بازگشت نیست.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmRound(false)} style={{ height: 42, padding: '0 18px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 }}>انصراف</button>
              <button onClick={doStartNewRound} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="refresh" size={16} stroke={1.9} /> شروع دور جدید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function arrowBtn(disabled) {
  return {
    width: 26, height: 18, display: 'grid', placeItems: 'center', borderRadius: 5,
    border: '1px solid var(--hair)', background: 'var(--surface)', cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? 'var(--hair)' : 'var(--ink-3)', padding: 0,
  };
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<LoanOrder />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
