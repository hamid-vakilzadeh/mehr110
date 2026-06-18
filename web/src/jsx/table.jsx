/* table.jsx — Members table. Sortable headers, search, family filter,
   expandable rows (share-by-share + loan detail). Behind = reserved warning + icon. */

const COLS = [
  { key: 'name',        label: 'عضو',       w: '' },
  { key: 'family',      label: 'خانواده',     w: '120px' },
  { key: 'nShares',     label: 'سهم‌ها',     w: '78px' },
  { key: 'fundedPct',   label: 'تأمین سهم',  w: '128px' },
  { key: 'seedBalance', label: 'موجودی',      w: '120px' },
  { key: 'status',      label: 'وضعیت',      w: '100px' },
];

const ALL_FAM = 'همهٔ خانواده‌ها';
const PAGE = 12; // rows per page

function SortHead({ col, sortKey, sortDir, onSort }) {
  const active = sortKey === col.key;
  return (
    <th style={{ width: col.w || 'auto', textAlign: 'right', padding: '0 14px', height: 42, verticalAlign: 'middle' }}>
      <button onClick={() => onSort(col.key)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        font: 'inherit', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600,
        color: active ? 'var(--ink)' : 'var(--ink-3)',
      }}>
        {col.label}
        <Icon name={active ? (sortDir === 'asc' ? 'sortUp' : 'sortDn') : 'sortNone'} size={13}
          stroke={1.8} style={{ opacity: active ? 0.9 : 0.4 }} />
      </button>
    </th>
  );
}

function ShareDetail({ m }) {
  const par = (window.FUND.settings && window.FUND.settings.parValue) || 0;
  const stats = [
    ['تعداد سهم', fmt(m.nShares), false],
    ['پس‌انداز', fmt(m.seedBalance) + ' تومان', false],
    ['سهم‌های تأمین‌شده', `${fmt(m.fundedShares)} از ${fmt(m.nShares)}`, false],
    ['سقف وام', fmt(m.maxLoan) + ' تومان', true],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: m.loan ? '1.1fr 1fr' : '1fr', gap: 28, padding: '4px 2px 6px', maxWidth: m.loan ? 'none' : 620 }}>
      {/* shares & savings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)' }}>سهم‌ها و پس‌انداز</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            padding: '3px 9px', borderRadius: 99,
            color: m.loanEligible ? 'var(--accent)' : 'var(--ink-3)',
            background: m.loanEligible ? 'var(--accent-soft)' : 'var(--surface-2)',
            border: `1px solid ${m.loanEligible ? 'var(--accent-line)' : 'var(--hair)'}`,
          }}>
            <Icon name={m.loanEligible ? 'check' : 'x'} size={12} stroke={2} />
            {m.loanEligible ? 'واجد شرایط وام' : 'واجد شرایط وام نیست'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {stats.map(([l, v, hl]) => (
            <div key={l} style={{ background: 'var(--surface)', border: `1px solid ${hl ? 'var(--accent-line)' : 'var(--hair-2)'}`, borderRadius: 9, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: hl ? 'var(--accent)' : 'var(--ink)', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {m.pendingShare && (
          <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--accent-line)', borderRadius: 10, padding: '13px 15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, color: 'var(--ink-2)', marginBottom: 7, whiteSpace: 'nowrap', gap: 10 }}>
              <span><span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt(m.pendingShare.paid)}</span> از <span className="mono">{fmt(m.pendingShare.target)}</span> تومان تأمین‌شده (برای {m.pendingShare.label})</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{faPct(m.pendingShare.pct)}٪</span>
            </div>
            <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${m.pendingShare.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
              <span className="mono">{fmt(m.pendingShare.remaining)}</span> تومان تا تأمین کامل سهم‌ها (حداقل پس‌انداز هر سهم: <span className="mono">{fmt(par)}</span>)
            </div>
          </div>
        )}
      </div>
      {/* loan */}
      {m.loan && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 12, whiteSpace: 'nowrap' }}>
            <Icon name="coins" size={14} /> وام فعال
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            {[['اصل وام', m.loan.principal, false], ['قسط ماهانه', m.loan.monthly, false], ['مانده', m.loan.outstanding, true]].map(([l, v, hl]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l}</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: hl ? 'var(--ink)' : 'var(--ink-2)', marginTop: 2 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, whiteSpace: 'nowrap', gap: 10 }}>
            <span>{fmt(m.loan.installmentsPaid)} از {fmt(m.loan.term)} قسط پرداخت شده</span>
            <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{faPct(m.loan.pct)}٪ بازپرداخت</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${m.loan.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* per-member quick actions (preselect the member on the record pages) */
function MemberActions({ m }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' };
  const ghost = { ...base, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)' };
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hair-2)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <a href={`record-payment.html?m=${m.id}`} style={{ ...base, background: 'var(--accent)', color: 'var(--surface)' }}><Icon name="check" size={15} stroke={2} /> ثبت پرداخت</a>
      <a href={`record-loan.html?m=${m.id}`} style={ghost}><Icon name="coins" size={15} stroke={1.7} /> ثبت وام</a>
      <a href={`statement.html?m=${m.id}`} style={ghost}><Icon name="arrowR" size={15} stroke={1.8} style={{ transform: 'scaleX(-1)' }} /> صورت‌حساب</a>
    </div>
  );
}

function MemberCards({ rows, open, setOpen, onClear, noMembers, nextId }) {
  if (rows.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '44px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--ink-3)' }}>
          <Icon name={noMembers ? 'users' : 'search'} size={24} stroke={1.4} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>{noMembers ? 'هنوز عضوی اضافه نشده است' : 'عضوی با جستجوی شما مطابقت ندارد'}</div>
          {noMembers
            ? <a href="add-member.html" style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>افزودن عضو</a>
            : <button onClick={onClear} style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>پاک کردن همه</button>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((m) => {
        const isOpen = open === m.id;
        return (
          <div key={m.id} style={{
            background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)',
            boxShadow: m.behind ? 'inset -3px 0 0 var(--warn)' : 'none', overflow: 'hidden',
          }}>
            <div onClick={() => setOpen(isOpen ? null : m.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {m.behind && <Icon name="alert" size={15} stroke={1.7} style={{ color: 'var(--warn)' }} />}
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{m.name}</span>
                {m.loanEligible && <span title="واجد شرایط وام" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="check" size={14} stroke={2.2} /></span>}
                {m.loan && <Icon name="coins" size={14} style={{ color: 'var(--ink-3)' }} />}
                {m.pendingShare && <Icon name="arrowUpRight" size={14} style={{ color: 'var(--accent)' }} />}
                <Icon name="chevron" size={15} style={{ color: 'var(--ink-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>خانوادهٔ {m.family}{m.behind && <span style={{ color: 'var(--warn)', fontWeight: 600 }}> · {fmt(m.missed)} قسط عقب</span>}</span>
                <LoanStatus m={m} isNext={m.id === nextId} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>
                    <span>تأمین {fmt(m.nShares)} سهم</span>
                    <span className="mono" style={{ fontWeight: 600, color: m.fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)' }}>{faPct(m.fundedPct)}٪</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${m.fundedPct}%`, height: '100%', background: m.fundedPct >= 100 ? 'var(--accent)' : m.behind ? 'var(--warn)' : 'var(--fill-1)', borderRadius: 99 }} />
                  </div>
                </div>
                <Money value={m.seedBalance} unit="تومان" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', flex: 'none' }} />
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '14px 16px' }}>
                <ShareDetail m={m} />
                <MemberActions m={m} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* first active member in the loan queue who hasn't received a loan this round */
function queueNextId(queue, byId) {
  for (const id of queue) { const m = byId[id]; if (m && m.status === 'active' && !m.loanReceived) return id; }
  return null;
}

/* loan-rotation status shown inline in همهٔ اعضا: star = next in line,
   pill = received / waiting (active members only). */
function LoanStatus({ m, isNext }) {
  if (m.status !== 'active') return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flex: 'none' }}>
      {isNext && <span title="نفر بعدیِ نوبت وام" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="star" size={15} /></span>}
      {m.loanReceived ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}>
          <Icon name="check" size={11} stroke={2} /> دریافت کرده
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>
          <Icon name="clock" size={11} stroke={1.8} /> در انتظار
        </span>
      )}
    </span>
  );
}

function MembersTable({ fund, isMobile }) {
  const [query, setQuery] = React.useState('');
  const [family, setFamily] = React.useState(ALL_FAM);
  const [behindOnly, setBehindOnly] = React.useState(false);
  const [purchasingOnly, setPurchasingOnly] = React.useState(false);
  const [sortKey, setSortKey] = React.useState('rank');
  const [sortDir, setSortDir] = React.useState('asc');
  const [open, setOpen] = React.useState(null);
  const [page, setPage] = React.useState(0);
  const [viewAll, setViewAll] = React.useState(false);
  const clearAll = () => { setQuery(''); setFamily(ALL_FAM); setBehindOnly(false); setPurchasingOnly(false); };

  // --- loan-queue ranking (drag to reorder; persisted via reorderLoanOrder) ---
  const baselineQueue = React.useMemo(() => (fund.loanOrder || []).map((m) => m.id), [fund.loanOrder]);
  const [queue, setQueue] = React.useState(baselineQueue);
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const [savedQueue, setSavedQueue] = React.useState(baselineQueue);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const dragGuard = React.useRef(false); // suppress the click-to-expand right after a drag
  const byId = React.useMemo(() => Object.fromEntries(fund.members.map((m) => [m.id, m])), [fund.members]);
  const rankOf = (id) => { const i = queue.indexOf(id); return i === -1 ? 1e9 : i; };
  const nextId = queueNextId(queue, byId);
  const orderDirty = queue.length !== savedQueue.length || queue.some((id, i) => id !== savedQueue[i]);

  React.useEffect(() => {
    const h = () => { setBehindOnly(true); setQuery(''); setFamily(ALL_FAM); };
    window.addEventListener('focus-behind', h);
    return () => window.removeEventListener('focus-behind', h);
  }, []);

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' || key === 'family' ? 'asc' : 'desc'); }
  };

  const famList = [ALL_FAM, ...fund.families.map((f) => f.family).sort()];

  const rows = React.useMemo(() => {
    let r = fund.members.slice();
    if (behindOnly) r = r.filter((m) => m.behind);
    if (purchasingOnly) r = r.filter((m) => m.pendingShare);
    if (family !== ALL_FAM) r = r.filter((m) => m.family === family);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((m) => m.name.toLowerCase().includes(q) || m.family.toLowerCase().includes(q));
    }
    const val = (m) => {
      if (sortKey === 'rank') return rankOf(m.id);
      if (sortKey === 'sinceSort') return m.since.y * 12 + m.since.m;
      if (sortKey === 'status') return m.status === 'active' ? 1 : 0;
      if (sortKey === 'fundedPct') return m.fundedPct;
      return m[sortKey];
    };
    r.sort((a, b) => {
      const av = val(a), bv = val(b);
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [fund.members, behindOnly, purchasingOnly, family, query, sortKey, sortDir, queue]);

  // drag-reorder the loan queue only in its natural order (rank, unfiltered)
  const dragEnabled = sortKey === 'rank' && !query.trim() && family === ALL_FAM && !behindOnly && !purchasingOnly;
  const onRowDrop = (targetId) => {
    if (dragId && targetId && dragId !== targetId) {
      setQueue((q) => {
        const from = q.indexOf(dragId), to = q.indexOf(targetId);
        if (from === -1 || to === -1) return q;
        const n = q.slice(); const [it] = n.splice(from, 1); n.splice(to, 0, it); return n;
      });
    }
    setDragId(null); setOverId(null);
  };
  const saveOrder = () => {
    if (window.API && window.API.live) {
      setSavingOrder(true);
      window.API.reorderLoanOrder(queue).then(() => { setSavedQueue(queue); setSavingOrder(false); })
        .catch((e) => { setSavingOrder(false); alert('خطا در ذخیرهٔ ترتیب: ' + (e && e.message ? e.message : e)); });
    } else { setSavedQueue(queue); }
  };

  // pagination — reset to first page whenever the filtered set changes
  React.useEffect(() => { setPage(0); }, [query, family, behindOnly, purchasingOnly, sortKey, sortDir]);
  const pageCount = viewAll ? 1 : Math.max(1, Math.ceil(rows.length / PAGE));
  const curPage = Math.min(page, pageCount - 1);
  const pageRows = viewAll ? rows : rows.slice(curPage * PAGE, curPage * PAGE + PAGE);

  const chip = (label, onClear) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--warn)', background: 'var(--warn-soft)', border: '1px solid var(--warn-line)', borderRadius: 99, padding: '5px 9px 5px 11px' }}>
      <Icon name="alert" size={13} stroke={1.7} />{label}
      <button onClick={onClear} style={{ display: 'grid', placeItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warn)', padding: 0 }}><Icon name="x" size={13} /></button>
    </span>
  );

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 340 }}>
          <Icon name="search" size={16} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی اعضا یا خانواده‌ها…"
            style={{ width: '100%', height: 40, padding: '0 38px 0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={family} onChange={(e) => setFamily(e.target.value)}
            style={{ height: 40, padding: '0 14px 0 34px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', cursor: 'pointer', appearance: 'none' }}>
            {famList.map((f) => <option key={f}>{f}</option>)}
          </select>
          <Icon name="chevron" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
        </div>
        <button onClick={() => setPurchasingOnly((v) => !v)} title="فقط اعضای در حال تأمین سهم" style={{
          height: 40, padding: '0 13px', borderRadius: 10, cursor: 'pointer', font: 'inherit', flex: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
          border: `1px solid ${purchasingOnly ? 'var(--accent-line)' : 'var(--hair)'}`,
          background: purchasingOnly ? 'var(--accent-soft)' : 'var(--surface)',
          color: purchasingOnly ? 'var(--accent)' : 'var(--ink-2)',
        }}>
          <Icon name="arrowUpRight" size={15} stroke={1.7} /> در حال تأمین
        </button>
        <button onClick={() => { clearAll(); setSortKey('rank'); setSortDir('asc'); setViewAll(true); }} title="نمایش به ترتیب نوبت وام (برای جابه‌جایی با کشیدن)" style={{
          height: 40, padding: '0 13px', borderRadius: 10, cursor: 'pointer', font: 'inherit', flex: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
          border: `1px solid ${dragEnabled ? 'var(--accent-line)' : 'var(--hair)'}`,
          background: dragEnabled ? 'var(--accent-soft)' : 'var(--surface)', color: dragEnabled ? 'var(--accent)' : 'var(--ink-2)',
        }}>
          <Icon name="grip" size={15} /> ترتیب نوبت وام
        </button>
        {behindOnly && chip('عقب‌افتاده در پرداخت', () => setBehindOnly(false))}
        <div style={{ marginInlineStart: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>
          {fmt(rows.length)} از {fmt(fund.members.length)} عضو
        </div>
      </div>

      {/* loan-queue context: drag hint (desktop) + full-management link */}
      {dragEnabled && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name={isMobile ? 'star' : 'grip'} size={14} />
            {isMobile ? 'ترتیب نوبت وام (جابه‌جایی از رایانه)' : 'ردیف‌ها را بکشید تا ترتیب نوبت وام را بچینید.'}
          </span>
          <a href="loan-order.html" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            مدیریت کامل نوبت وام (علامت دریافت / دور جدید) <Icon name="arrowR" size={14} stroke={1.8} style={{ transform: 'scaleX(-1)' }} />
          </a>
        </div>
      )}

      {/* table (desktop) / cards (mobile) */}
      {isMobile ? (
        <MemberCards rows={pageRows} open={open} setOpen={setOpen} noMembers={fund.members.length === 0} onClear={clearAll} nextId={nextId} />
      ) : (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col /><col style={{ width: '120px' }} /><col style={{ width: '78px' }} /><col style={{ width: '128px' }} /><col style={{ width: '120px' }} /><col style={{ width: '110px' }} /><col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
              {COLS.map((c) => <SortHead key={c.key} col={c} sortKey={sortKey} sortDir={sortDir} onSort={onSort} />)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--ink-3)' }}>
                    <Icon name={fund.members.length === 0 ? 'users' : 'search'} size={26} stroke={1.4} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>{fund.members.length === 0 ? 'هنوز عضوی اضافه نشده است' : 'عضوی با جستجوی شما مطابقت ندارد'}</div>
                    {fund.members.length === 0
                      ? <a href="add-member.html" style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>افزودن عضو</a>
                      : <>
                        <div style={{ fontSize: 13 }}>نام دیگری را امتحان کنید یا فیلترها را پاک کنید.</div>
                        <button onClick={clearAll}
                          style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>پاک کردن همه</button>
                      </>}
                  </div>
                </td>
              </tr>
            )}
            {pageRows.map((m) => {
              const isOpen = open === m.id;
              const canDrag = dragEnabled && m.status === 'active';
              const isOver = canDrag && overId === m.id && dragId !== m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr className={'mrow' + (isOver ? ' is-over' : '')}
                    onClick={() => { if (dragGuard.current) { dragGuard.current = false; return; } setOpen(isOpen ? null : m.id); }}
                    draggable={canDrag}
                    onDragStart={canDrag ? () => { dragGuard.current = true; setDragId(m.id); } : undefined}
                    onDragEnter={canDrag ? () => setOverId(m.id) : undefined}
                    onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
                    onDrop={canDrag ? () => onRowDrop(m.id) : undefined}
                    onDragEnd={canDrag ? () => { setDragId(null); setOverId(null); setTimeout(() => { dragGuard.current = false; }, 0); } : undefined}
                    style={{
                      borderBottom: isOpen ? 'none' : '1px solid var(--hair-2)',
                      cursor: dragId === m.id ? 'grabbing' : canDrag ? 'grab' : 'pointer',
                      background: isOpen || dragId === m.id ? 'var(--surface-2)' : 'transparent',
                      boxShadow: [m.behind && 'inset -3px 0 0 var(--warn)', m.id === nextId && 'inset 3px 0 0 var(--accent)'].filter(Boolean).join(', ') || 'none',
                      opacity: dragId === m.id ? 0.5 : 1,
                    }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, rowGap: 5, minWidth: 0, flexWrap: 'wrap' }}>
                        {dragEnabled && m.status === 'active' && <span title="برای جابه‌جایی بکشید" style={{ display: 'inline-flex', color: 'var(--ink-3)', flex: 'none' }}><Icon name="grip" size={15} /></span>}
                        {m.behind
                          ? <Icon name="alert" size={15} stroke={1.7} style={{ color: 'var(--warn)' }} />
                          : <span style={{ width: 15, flex: 'none' }} />}
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</span>
                        {m.behind && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warn)', whiteSpace: 'nowrap' }}>· {fmt(m.missed)} قسط عقب</span>}
                        {m.loan && <span title="وام فعال دارد" style={{ display: 'inline-flex', color: 'var(--ink-3)' }}><Icon name="coins" size={13} /></span>}
                        {m.pendingShare && <span title="سهم تأمین‌نشده" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="arrowUpRight" size={13} /></span>}
                        <LoanStatus m={m} isNext={m.id === nextId} />
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13.5, color: 'var(--ink-2)' }}>{m.family}</td>
                    <td style={{ padding: '13px 14px', textAlign: 'right' }} className="mono"><span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{fmt(m.nShares)}</span></td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', minWidth: 30 }}>
                          <div style={{ width: `${m.fundedPct}%`, height: '100%', background: m.fundedPct >= 100 ? 'var(--accent)' : m.behind ? 'var(--warn)' : 'var(--fill-1)', borderRadius: 99 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: m.fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)', width: 38, textAlign: 'left', flex: 'none' }}>{faPct(m.fundedPct)}٪</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'right' }}><span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt(m.seedBalance)}</span></td>
                    <td style={{ padding: '13px 14px' }}><StatusPill status={m.status} /></td>
                    <td style={{ padding: '13px 0 13px 12px', textAlign: 'left' }}>
                      <Icon name="chevron" size={16} style={{ color: 'var(--ink-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
                      <td colSpan={7} style={{ padding: '4px 38px 20px 22px' }}>
                        <ShareDetail m={m} />
                        <MemberActions m={m} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* loan-queue save / revert (appears after a drag) */}
      {orderDirty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap', background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>ترتیب نوبت وام تغییر کرده — ذخیره نشده است.</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setQueue(baselineQueue)} title="بازگشت به ترتیب اولیه" style={{ height: 38, padding: '0 16px', borderRadius: 9, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', cursor: 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="refresh" size={15} stroke={1.8} /> بازگردانی
            </button>
            <button onClick={saveOrder} disabled={savingOrder} style={{ height: 38, padding: '0 18px', borderRadius: 9, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: savingOrder ? 'default' : 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600, opacity: savingOrder ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="check" size={16} stroke={2} /> {savingOrder ? 'در حال ذخیره…' : 'ثبت ترتیب'}
            </button>
          </div>
        </div>
      )}

      {/* pager + view-all */}
      {rows.length > PAGE && (() => {
        const btn = (disabled) => ({
          height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid var(--hair)',
          background: 'var(--surface)', color: disabled ? 'var(--ink-3)' : 'var(--ink)',
          cursor: disabled ? 'default' : 'pointer', font: 'inherit', fontSize: 13.5, fontWeight: 600,
          opacity: disabled ? 0.5 : 1,
        });
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
            {!viewAll && pageCount > 1 && (
              <React.Fragment>
                <button disabled={curPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} style={btn(curPage === 0)}>قبلی</button>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>صفحهٔ {faDigits(curPage + 1)} از {faDigits(pageCount)}</span>
                <button disabled={curPage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} style={btn(curPage >= pageCount - 1)}>بعدی</button>
              </React.Fragment>
            )}
            <button onClick={() => setViewAll((v) => !v)} style={{ ...btn(false), color: 'var(--ink-2)' }}>
              {viewAll ? 'نمایش صفحه‌ای' : `نمایش همه (${faDigits(rows.length)})`}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

/* ---- loading placeholders (mirror the desktop table + mobile cards) ---- */
function MemberRowSkeleton() {
  const td = { padding: '13px 14px' };
  const tdR = { ...td, textAlign: 'right' };
  return (
    <tr style={{ borderBottom: '1px solid var(--hair-2)' }}>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 15, flex: 'none' }} />
          <Skel width={120} height={13} radius={5} />
        </div>
      </td>
      <td style={td}><Skel width={70} height={13} radius={5} /></td>
      <td style={tdR}><Skel width={24} height={13} radius={5} style={{ display: 'inline-block' }} /></td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skel height={6} radius={99} style={{ flex: 1, minWidth: 30 }} />
          <Skel width={30} height={12} radius={5} />
        </div>
      </td>
      <td style={tdR}><Skel width={74} height={14} radius={5} style={{ display: 'inline-block' }} /></td>
      <td style={td}><Skel width={56} height={14} radius={99} /></td>
      <td style={{ padding: '13px 0 13px 12px' }}><Skel width={16} height={16} radius={5} /></td>
    </tr>
  );
}

function TableSkeleton({ rows = 8 }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col /><col style={{ width: '120px' }} /><col style={{ width: '78px' }} /><col style={{ width: '128px' }} /><col style={{ width: '120px' }} /><col style={{ width: '110px' }} /><col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)', height: 42 }}>
            {[44, 60, 48, 70, 56, 44].map((w, i) => (
              <th key={i} style={{ textAlign: 'right', padding: '0 14px', verticalAlign: 'middle' }}><Skel width={w} height={12} radius={5} /></th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => <MemberRowSkeleton key={i} />)}
        </tbody>
      </table>
    </div>
  );
}

function CardListSkeleton({ rows = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Skel height={15} radius={5} style={{ flex: 1, maxWidth: 180 }} />
              <Skel width={15} height={15} radius={5} />
            </div>
            <Skel width={120} height={12} radius={5} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <Skel height={7} radius={99} style={{ flex: 1 }} />
              <Skel width={72} height={16} radius={5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MembersTableSkeleton({ isMobile }) {
  const m = isMobile === undefined ? useIsMobile() : isMobile;
  return (
    <div>
      {/* toolbar placeholder so the real search/filters don't shift the list */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Skel height={40} radius={10} style={{ flex: '1 1 260px', maxWidth: 340 }} />
        {!m && <Skel width={140} height={40} radius={10} />}
        {!m && <Skel width={120} height={40} radius={10} />}
      </div>
      {m ? <CardListSkeleton /> : <TableSkeleton />}
    </div>
  );
}

Object.assign(window, { MembersTable, MembersTableSkeleton, TableSkeleton, CardListSkeleton });
