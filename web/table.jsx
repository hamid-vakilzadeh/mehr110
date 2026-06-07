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

function MemberCards({ rows, open, setOpen, onClear, noMembers }) {
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
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                خانوادهٔ {m.family}{m.behind && <span style={{ color: 'var(--warn)', fontWeight: 600 }}> · {fmt(m.missed)} قسط عقب</span>}
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
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hair-2)' }}>
                  <a href={`statement.html?m=${m.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                    مشاهدهٔ صورت‌حساب عضو <Icon name="arrowR" size={15} stroke={1.8} style={{ transform: 'scaleX(-1)' }} />
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MembersTable({ fund, isMobile }) {
  const [query, setQuery] = React.useState('');
  const [family, setFamily] = React.useState(ALL_FAM);
  const [behindOnly, setBehindOnly] = React.useState(false);
  const [sortKey, setSortKey] = React.useState('seedBalance');
  const [sortDir, setSortDir] = React.useState('desc');
  const [open, setOpen] = React.useState(null);

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
    if (family !== ALL_FAM) r = r.filter((m) => m.family === family);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((m) => m.name.toLowerCase().includes(q) || m.family.toLowerCase().includes(q));
    }
    const val = (m) => {
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
  }, [fund.members, behindOnly, family, query, sortKey, sortDir]);

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
        {behindOnly && chip('عقب‌افتاده در پرداخت', () => setBehindOnly(false))}
        <div style={{ marginInlineStart: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>
          {fmt(rows.length)} از {fmt(fund.members.length)} عضو
        </div>
      </div>

      {/* table (desktop) / cards (mobile) */}
      {isMobile ? (
        <MemberCards rows={rows} open={open} setOpen={setOpen} noMembers={fund.members.length === 0} onClear={() => { setQuery(''); setFamily(ALL_FAM); setBehindOnly(false); }} />
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
                        <button onClick={() => { setQuery(''); setFamily(ALL_FAM); setBehindOnly(false); }}
                          style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>پاک کردن همه</button>
                      </>}
                  </div>
                </td>
              </tr>
            )}
            {rows.map((m) => {
              const isOpen = open === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr onClick={() => setOpen(isOpen ? null : m.id)} className="mrow" style={{
                    borderBottom: isOpen ? 'none' : '1px solid var(--hair-2)', cursor: 'pointer',
                    background: isOpen ? 'var(--surface-2)' : 'transparent',
                    boxShadow: m.behind ? 'inset -3px 0 0 var(--warn)' : 'none',
                  }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        {m.behind
                          ? <Icon name="alert" size={15} stroke={1.7} style={{ color: 'var(--warn)' }} />
                          : <span style={{ width: 15, flex: 'none' }} />}
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</span>
                        {m.behind && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warn)', whiteSpace: 'nowrap' }}>· {fmt(m.missed)} قسط عقب</span>}
                        {m.loan && <span title="وام فعال دارد" style={{ display: 'inline-flex', color: 'var(--ink-3)' }}><Icon name="coins" size={13} /></span>}
                        {m.pendingShare && <span title="سهم تأمین‌نشده" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="arrowUpRight" size={13} /></span>}
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
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hair-2)' }}>
                          <a href={`statement.html?m=${m.id}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                            color: 'var(--accent)', textDecoration: 'none',
                          }}>
                            مشاهدهٔ صورت‌حساب عضو <Icon name="arrowR" size={15} stroke={1.8} style={{ transform: 'scaleX(-1)' }} />
                          </a>
                        </div>
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
    </div>
  );
}

Object.assign(window, { MembersTable });
