/* statement.jsx — صورت‌حساب عضو (فقط‌خواندنی برای اعضا؛ ویرایش/حذف برای مدیر).
   موجودی، سهم‌ها، وام، نوبت وام، معرف، و رسیدهای پرداخت. عضو از طریق ?m=ID. */

function pickMember(fund) {
  const params = new URLSearchParams(location.search);
  const id = params.get('m');
  let m = id && fund.members.find((x) => x.id === id);
  if (!m) m = fund.members.find((x) => x.loan) || fund.members[0];
  return m;
}

function Card({ title, icon, accent, children, right }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && <span style={{ color: accent ? 'var(--accent)' : 'var(--ink-3)', display: 'inline-flex' }}><Icon name={icon} size={16} /></span>}
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{title}</h3>
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/* expandable receipts table */
function Receipts({ title, rows }) {
  const [open, setOpen] = React.useState(false);
  const total = rows.reduce((t, r) => t + r.amount, 0);
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px',
        background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'right',
      }}>
        <Icon name="rows" size={16} style={{ color: 'var(--ink-3)' }} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmt(rows.length)} رسید · <span className="mono" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{fmt(total)}</span> تومان</span>
        <Icon name="chevron" size={16} style={{ color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--hair)', padding: '4px 20px 14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
                <th style={{ padding: '8px 0', fontWeight: 500 }}>شمارهٔ رسید</th>
                <th style={{ padding: '8px 0', fontWeight: 500 }}>تاریخ</th>
                <th style={{ padding: '8px 0', fontWeight: 500, textAlign: 'left' }}>مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.no} style={{ borderTop: '1px solid var(--hair-2)' }}>
                  <td style={{ padding: '9px 0', fontSize: 13, color: 'var(--ink-2)' }} className="mono">{faDigits(r.no)}</td>
                  <td style={{ padding: '9px 0', fontSize: 13, color: 'var(--ink-2)' }}>{r.date}</td>
                  <td style={{ padding: '9px 0', fontSize: 13.5, color: 'var(--ink)', textAlign: 'left', fontWeight: 600 }} className="mono">{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Statement() {
  const fund = window.FUND;
  const m = pickMember(fund);
  const isMobile = useIsMobile();
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  if (!m) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '90px 22px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)' }}>عضوی یافت نشد</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.8, margin: '8px 0 20px' }}>هنوز عضوی در صندوق ثبت نشده است.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="add-member.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>افزودن عضو</a>
          <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '90px 22px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: 99, background: 'var(--surface-2)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Icon name="trash" size={26} stroke={1.7} />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 23, color: 'var(--ink)', lineHeight: 1.4 }}>عضو حذف شد</h2>
          <p style={{ margin: '10px 0 22px', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.7 }}><strong>{m.name}</strong> از صندوق حذف شد.</p>
          <a href="dashboard.html" style={{ height: 44, padding: '0 22px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 20px 64px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none' }}>
          <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href={`add-member.html?edit=${m.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--surface)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            <Icon name="edit" size={14} stroke={1.8} /> ویرایش
          </a>
          <button onClick={() => setConfirmDel(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid var(--warn-line)', background: 'var(--warn-soft)', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--warn)', whiteSpace: 'nowrap' }}>
            <Icon name="trash" size={14} stroke={1.8} /> حذف
          </button>
        </div>
      </div>

      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22 }}>
          {m.name.trim()[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 26, color: 'var(--ink)', lineHeight: 1.3 }}>{m.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>
            <span>خانوادهٔ {m.family}</span><span>·</span><StatusPill status={m.status} />
          </div>
        </div>
      </div>

      {/* hero balance */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-3)' }}>موجودی پس‌انداز شما</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
            padding: '4px 10px', borderRadius: 99,
            color: m.loanEligible ? 'var(--accent)' : 'var(--ink-3)',
            background: m.loanEligible ? 'var(--accent-soft)' : 'var(--surface-2)',
            border: `1px solid ${m.loanEligible ? 'var(--accent-line)' : 'var(--hair)'}`,
          }}>
            <Icon name={m.loanEligible ? 'check' : 'x'} size={13} stroke={2} />
            {m.loanEligible ? 'واجد شرایط وام' : 'واجد شرایط وام نیست'}
          </span>
        </div>
        <Money value={m.seedBalance} unit="تومان" style={{ fontSize: 44, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.15, display: 'block', marginTop: 8 }} />
        <div style={{ display: 'flex', gap: 22, marginTop: 14, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>سهم‌ها</div><div className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{fmt(m.nShares)}</div></div>
          <div style={{ width: 1, background: 'var(--hair)' }} />
          <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>تأمین</div><div className="mono" style={{ fontSize: 17, fontWeight: 600, color: m.fundedPct >= 100 ? 'var(--accent)' : 'var(--ink)', marginTop: 2 }}>{faPct(m.fundedPct)}٪</div></div>
          <div style={{ width: 1, background: 'var(--hair)' }} />
          <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>حق عضویت ماهانه</div><div className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{fmt(fund.settings.membershipFee)}</div></div>
        </div>
      </div>

      {/* shares */}
      <Card title="سهم‌های شما" icon="grid">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
              <th style={{ padding: '0 0 8px', fontWeight: 500 }}>سهم</th>
              <th style={{ padding: '0 0 8px', fontWeight: 500, textAlign: 'right' }}>تأمین</th>
              <th style={{ padding: '0 0 8px', fontWeight: 500, textAlign: 'right' }}>موجودی</th>
            </tr>
          </thead>
          <tbody>
            {m.shares.map((s) => (
              <tr key={s.label} style={{ borderTop: '1px solid var(--hair-2)' }}>
                <td style={{ padding: '9px 0', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {s.label}
                    {s.funded
                      ? <span title="واجد شرایط وام" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="check" size={13} stroke={2.2} /></span>
                      : <span title="تأمین‌نشده — واجد وام نیست" style={{ display: 'inline-flex', color: 'var(--ink-3)' }}><Icon name="x" size={12} stroke={2} /></span>}
                  </span>
                </td>
                <td style={{ padding: '9px 0', fontSize: 13, textAlign: 'right' }} className="mono"><span style={{ color: s.funded ? 'var(--accent)' : 'var(--ink-2)', fontWeight: 600 }}>{faPct(s.fundedPct)}٪</span></td>
                <td style={{ padding: '9px 0', fontSize: 13.5, color: 'var(--ink)', textAlign: 'right', fontWeight: 600 }} className="mono">{fmt(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!m.loanEligible && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid var(--hair-2)' }}>
            تا زمانی که دست‌کم یک سهم به ارزش کامل ({fmt(fund.settings.parValue)} تومان) تأمین نشود، این عضو واجد شرایط وام نیست. پس‌انداز را می‌توان از طریق «ثبت پرداخت» افزایش داد.
          </div>
        )}
      </Card>

      {/* loan */}
      {m.loan && (
        <Card title="وام فعال" icon="coins">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            {[['اصل وام', m.loan.principal], ['قسط ماهانه', m.loan.monthly], ['مانده', m.loan.outstanding]].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${m.loan.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
            <span>{fmt(m.loan.installmentsPaid)} از {fmt(m.loan.term)} قسط پرداخت‌شده</span>
            <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{faPct(m.loan.pct)}٪ بازپرداخت</span>
          </div>
        </Card>
      )}

      {/* payment receipts — expandable on demand */}
      <Receipts title="رسیدهای پس‌انداز و حق عضویت" rows={m.seedReceipts} />
      {m.installmentReceipts.length > 0 && <Receipts title="رسیدهای اقساط وام" rows={m.installmentReceipts} />}

      {/* loan turn + contact (incl. referrer) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <Card title="نوبت وام" icon="star">
          {m.loanReceived
            ? <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>در این دور <strong style={{ color: 'var(--ink)' }}>وام گرفته‌اید</strong>.</div>
            : m.loanPos
              ? <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>در ترتیب وام، نفر <strong className="mono" style={{ color: 'var(--accent)' }}>{fmt(m.loanPos)}</strong> هستید.</div>
              : <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>—</div>}
        </Card>
        <Card title="اطلاعات تماس و معرف" icon="user">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {m.phones.map((p, i) => <div key={i} className="mono" style={{ fontSize: 13, color: 'var(--ink-2)', direction: 'ltr', textAlign: 'right' }}>{faDigits(p)}</div>)}
            {m.accounts.map((a, i) => <div key={'a' + i} className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)', direction: 'ltr', textAlign: 'right' }}>حساب: {faDigits(a)}</div>)}
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--hair-2)' }}>
              معرف: <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{m.referredBy || 'بدون معرف'}</span>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
        صورت‌حساب صندوق مهر۱۱۰ · تا تاریخِ {fund.meta.asOf}
      </div>

      {/* delete confirm */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(false)} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.01 65 / 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '26px 28px', maxWidth: 400, width: '100%', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--warn-soft)', color: 'var(--warn)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="trash" size={20} stroke={1.8} /></div>
              <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>حذف عضو</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              آیا از حذف <strong>{m.name}</strong> مطمئن‌اید؟ این کار سوابق و رسیدهای او را نیز حذف می‌کند و قابل بازگشت نیست.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmDel(false)} style={{ height: 42, padding: '0 18px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 }}>انصراف</button>
              <button onClick={async () => {
                if (window.API && window.API.live) {
                  try { await window.API.deleteMember(m.id); }
                  catch (e) { alert('خطا در حذف: ' + (e && e.message ? e.message : e)); return; }
                }
                setConfirmDel(false); setDeleted(true); window.scrollTo(0, 0);
              }} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--warn)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Icon name="trash" size={16} stroke={1.9} /> حذف عضو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<Statement />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
