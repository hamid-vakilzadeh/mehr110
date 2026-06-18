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

/* ---- shared edit/delete helpers (admin) ---- */
const FA_MONTHS_ST = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function msToJalali(ms) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric', month: 'numeric', year: 'numeric', numberingSystem: 'latn' }).formatToParts(new Date(Number(ms) || Date.now()));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: g('year'), m: g('month'), d: g('day') };
}
const stInput = {
  height: 40, padding: '0 12px', borderRadius: 9, border: '1px solid var(--hair)',
  background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--ink)', width: '100%',
};
function StSelect({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...stInput, padding: '0 12px 0 30px', cursor: 'pointer', appearance: 'none' }}>{children}</select>
      <Icon name="chevron" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
    </div>
  );
}
function StField({ label, children }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>{children}</label>;
}
function JDate({ y, m, d, setY, setM, setD }) {
  const ty = msToJalali(Date.now()).y;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.2fr', gap: 8 }}>
      <StSelect value={d} onChange={(v) => setD(Number(v))}>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faDigits(i + 1)}</option>)}</StSelect>
      <StSelect value={m} onChange={(v) => setM(Number(v))}>{FA_MONTHS_ST.map((mm, i) => <option key={i} value={i + 1}>{mm}</option>)}</StSelect>
      <StSelect value={y} onChange={(v) => setY(Number(v))}>{Array.from({ length: 30 }, (_, i) => ty - i).map((yy) => <option key={yy} value={yy}>{faDigits(yy)}</option>)}</StSelect>
    </div>
  );
}
function Modal({ children, onClose, maxWidth = 440 }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.01 65 / 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '24px 26px', maxWidth, width: '100%', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}
const btnGhost = { height: 42, padding: '0 18px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 };
const btnWarn = { height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--warn)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 };
const btnAccent = { height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 };

/* generic delete confirmation */
function ConfirmDelete({ title, body, confirmLabel, onCancel, onConfirm }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal onClose={busy ? () => {} : onCancel}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--warn-soft)', color: 'var(--warn)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="trash" size={20} stroke={1.8} /></div>
        <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>{title}</h3>
      </div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>{body}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button disabled={busy} onClick={onCancel} style={btnGhost}>انصراف</button>
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await onConfirm(); }
          catch (e) { setBusy(false); alert('خطا در حذف: ' + (e && e.message ? e.message : e)); }
        }} style={{ ...btnWarn, opacity: busy ? 0.7 : 1 }}>
          <Icon name="trash" size={16} stroke={1.9} /> {busy ? 'در حال حذف…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* edit a payment (amount + date + bank ref + note); amount re-adjusts balances server-side */
function PaymentEditModal({ member, receipt, onClose, onSaved }) {
  const init = msToJalali(receipt.dateMs);
  const [amount, setAmount] = React.useState(String(receipt.amount));
  const [y, setY] = React.useState(init.y);
  const [m, setM] = React.useState(init.m);
  const [d, setD] = React.useState(init.d);
  const [bank, setBank] = React.useState(receipt.bankTxnId || '');
  const [note, setNote] = React.useState(receipt.note || '');
  const [busy, setBusy] = React.useState(false);
  const amt = Number(amount) || 0;
  const save = async () => {
    if (amt <= 0) { alert('مبلغ باید بزرگ‌تر از صفر باشد.'); return; }
    setBusy(true);
    try {
      if (window.API && window.API.live) {
        const date = window.API.jalaliToMs(y, m, d);
        await window.API.updatePayment({ memberId: member.id, paymentId: receipt.id, amount: amt, date, bankTxnId: bank.trim() || null, note: note.trim() || null });
      }
      await onSaved();
    } catch (e) { setBusy(false); alert('خطا در ویرایش: ' + (e && e.message ? e.message : e)); }
  };
  return (
    <Modal onClose={busy ? () => {} : onClose}>
      <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>ویرایش رسید {faDigits(receipt.no)}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <StField label="مبلغ (تومان)"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} className="mono" inputMode="numeric" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
        <StField label="تاریخ"><JDate y={y} m={m} d={d} setY={setY} setM={setM} setD={setD} /></StField>
        <StField label="شناسهٔ تراکنش بانکی (اختیاری)"><input value={bank} onChange={(e) => setBank(e.target.value)} className="mono" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
        <StField label="یادداشت (اختیاری)"><input value={note} onChange={(e) => setNote(e.target.value)} style={stInput} /></StField>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button disabled={busy} onClick={onClose} style={btnGhost}>انصراف</button>
        <button disabled={busy} onClick={save} style={{ ...btnAccent, opacity: busy ? 0.7 : 1 }}><Icon name="check" size={16} stroke={2} /> {busy ? 'در حال ذخیره…' : 'ذخیرهٔ تغییرات'}</button>
      </div>
    </Modal>
  );
}

/* edit a loan (principal/term/monthly/date + bank ref + note); principal re-adjusts outstanding */
function LoanEditModal({ member, onClose, onSaved }) {
  const loan = member.loan;
  const init = msToJalali(loan.issuedAt);
  const [principal, setPrincipal] = React.useState(String(loan.principal));
  const [term, setTerm] = React.useState(String(loan.termMonths != null ? loan.termMonths : loan.term));
  const [monthly, setMonthly] = React.useState(String(loan.monthly));
  const [y, setY] = React.useState(init.y);
  const [m, setM] = React.useState(init.m);
  const [d, setD] = React.useState(init.d);
  const [bank, setBank] = React.useState(loan.bankTxnId || '');
  const [note, setNote] = React.useState(loan.note || '');
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    const P = Number(principal) || 0, T = Number(term) || 0, M = Number(monthly) || 0;
    if (P <= 0 || T <= 0 || M <= 0) { alert('اصل، مدت و قسط باید بزرگ‌تر از صفر باشند.'); return; }
    setBusy(true);
    try {
      if (window.API && window.API.live) {
        const issuedAt = window.API.jalaliToMs(y, m, d);
        await window.API.updateLoan({ memberId: member.id, loanId: loan.id, principal: P, termMonths: T, monthly: M, issuedAt, bankTxnId: bank.trim() || null, note: note.trim() || null });
      }
      await onSaved();
    } catch (e) { setBusy(false); alert('خطا در ویرایش وام: ' + (e && e.message ? e.message : e)); }
  };
  return (
    <Modal onClose={busy ? () => {} : onClose}>
      <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--ink)' }}>ویرایش وام</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <StField label="اصل وام (تومان)"><input value={principal} onChange={(e) => setPrincipal(e.target.value.replace(/[^0-9]/g, ''))} className="mono" inputMode="numeric" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StField label="مدت (ماه)"><input value={term} onChange={(e) => setTerm(e.target.value.replace(/[^0-9]/g, ''))} className="mono" inputMode="numeric" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
          <StField label="قسط ماهانه"><input value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^0-9]/g, ''))} className="mono" inputMode="numeric" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
        </div>
        <StField label="تاریخ پرداخت وام"><JDate y={y} m={m} d={d} setY={setY} setM={setM} setD={setD} /></StField>
        <StField label="شناسهٔ تراکنش بانکی (اختیاری)"><input value={bank} onChange={(e) => setBank(e.target.value)} className="mono" style={{ ...stInput, direction: 'ltr', textAlign: 'left' }} /></StField>
        <StField label="یادداشت (اختیاری)"><input value={note} onChange={(e) => setNote(e.target.value)} style={stInput} /></StField>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>تغییر «اصل وام» به همان میزان روی ماندهٔ وام اعمال می‌شود.</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button disabled={busy} onClick={onClose} style={btnGhost}>انصراف</button>
        <button disabled={busy} onClick={save} style={{ ...btnAccent, opacity: busy ? 0.7 : 1 }}><Icon name="check" size={16} stroke={2} /> {busy ? 'در حال ذخیره…' : 'ذخیرهٔ تغییرات'}</button>
      </div>
    </Modal>
  );
}

const txnIconBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };

/* expandable receipts list with per-row edit/delete (admin) */
function Receipts({ title, rows, member, onChanged }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
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
        <div style={{ borderTop: '1px solid var(--hair)', padding: '6px 20px 12px' }}>
          {rows.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', padding: '10px 0' }}>رسیدی ثبت نشده است.</div>}
          {rows.map((r) => (
            <div key={r.id || r.no} style={{ borderTop: '1px solid var(--hair-2)', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)', width: 54, flex: 'none' }}>{faDigits(r.no)}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)', minWidth: 0 }}>{r.date}</span>
                <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{fmt(r.amount)}</span>
                <button title="ویرایش" onClick={() => setEditing(r)} style={txnIconBtn}><Icon name="edit" size={14} stroke={1.8} style={{ color: 'var(--ink-2)' }} /></button>
                <button title="حذف" onClick={() => setDeleting(r)} style={{ ...txnIconBtn, borderColor: 'var(--warn-line)', background: 'var(--warn-soft)' }}><Icon name="trash" size={14} stroke={1.8} style={{ color: 'var(--warn)' }} /></button>
              </div>
              {(r.bankTxnId || r.note) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 5, paddingRight: 64, fontSize: 11.5, color: 'var(--ink-3)' }}>
                  {r.bankTxnId && <span>کد بانکی: <span className="mono" style={{ direction: 'ltr', color: 'var(--ink-2)' }}>{r.bankTxnId}</span></span>}
                  {r.note && <span>یادداشت: <span style={{ color: 'var(--ink-2)' }}>{r.note}</span></span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && <PaymentEditModal member={member} receipt={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
      {deleting && (
        <ConfirmDelete
          title="حذف رسید"
          body={<>آیا از حذف رسید <span className="mono">{faDigits(deleting.no)}</span> به مبلغ <span className="mono">{fmt(deleting.amount)}</span> تومان مطمئن‌اید؟ موجودی به‌طور خودکار اصلاح می‌شود و این کار قابل بازگشت نیست.</>}
          confirmLabel="حذف رسید"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            if (window.API && window.API.live) await window.API.deletePayment({ memberId: member.id, paymentId: deleting.id });
            setDeleting(null); await onChanged();
          }}
        />
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
  const [editLoan, setEditLoan] = React.useState(false);
  const [delLoan, setDelLoan] = React.useState(false);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const downloadPdf = React.useCallback(async () => {
    setPdfBusy(true);
    try {
      if (window.API && window.API.reportsEnabled && window.API.reportsEnabled()) {
        await window.API.downloadReport('member-statement', { m: m.id }, { printFallback: true });
      } else {
        window.print(); // demo / offline fallback
      }
    } catch (e) {
      alert('خطا در دانلود گزارش: ' + (e && e.message ? e.message : e));
    } finally {
      setPdfBusy(false);
    }
  }, [m && m.id]);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const reload = React.useCallback(async () => {
    if (window.API && window.API.live && window.API.loadFund) { try { await window.API.loadFund(); } catch (e) {} }
    force();
  }, []);

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
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none' }}>
          <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={downloadPdf} disabled={pdfBusy} title="دانلود صورت‌حساب به‌صورت PDF" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 9, border: 'none', background: 'var(--accent)', cursor: pdfBusy ? 'default' : 'pointer', opacity: pdfBusy ? 0.7 : 1, font: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--surface)', whiteSpace: 'nowrap' }}>
            <Icon name="download" size={14} stroke={1.9} /> {pdfBusy ? 'در حال ساخت…' : 'دانلود PDF'}
          </button>
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
          <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>سقف وام</div><div className="mono" style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>{fmt(m.maxLoan)}</div></div>
        </div>
      </div>

      {/* shares & savings */}
      <Card title="سهم‌ها و سقف وام" icon="grid">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['تعداد سهم', fmt(m.nShares)],
            ['سهم‌های تأمین‌شده', `${fmt(m.fundedShares)} از ${fmt(m.nShares)}`],
            ['پس‌انداز', fmt(m.seedBalance) + ' تومان'],
            ['سقف وام', fmt(m.maxLoan) + ' تومان'],
          ].map(([l, v], i) => (
            <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 9, padding: '11px 13px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l}</div>
              <div className="mono" style={{ fontSize: 15.5, fontWeight: 600, color: i === 3 ? 'var(--accent)' : 'var(--ink)', marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
        {m.funding && m.pendingShare && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', marginBottom: 7, gap: 10, whiteSpace: 'nowrap' }}>
              <span><span className="mono" style={{ fontWeight: 600 }}>{fmt(m.pendingShare.paid)}</span> از <span className="mono">{fmt(m.pendingShare.target)}</span> تومان تأمین‌شده</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{faPct(m.pendingShare.pct)}٪</span>
            </div>
            <div style={{ height: 9, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${m.pendingShare.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
            </div>
          </div>
        )}
        {!m.loanEligible && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid var(--hair-2)' }}>
            تا زمانی که پس‌انداز به حداقل هر سهم ({fmt(fund.settings.parValue)} تومان) نرسد، این عضو واجد شرایط وام نیست. پس‌انداز را می‌توان از طریق «ثبت پرداخت» افزایش داد.
          </div>
        )}
      </Card>

      {/* loan */}
      {m.loan && (
        <Card title="وام فعال" icon="coins" right={
          <div style={{ display: 'flex', gap: 6 }}>
            <button title="ویرایش وام" onClick={() => setEditLoan(true)} style={txnIconBtn}><Icon name="edit" size={14} stroke={1.8} style={{ color: 'var(--ink-2)' }} /></button>
            <button title="حذف وام" onClick={() => setDelLoan(true)} style={{ ...txnIconBtn, borderColor: 'var(--warn-line)', background: 'var(--warn-soft)' }}><Icon name="trash" size={14} stroke={1.8} style={{ color: 'var(--warn)' }} /></button>
          </div>
        }>
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

      {/* payment receipts — expandable on demand; admin can edit/delete each */}
      <Receipts title="رسیدهای پس‌انداز و حق عضویت" rows={m.seedReceipts} member={m} onChanged={reload} />
      {m.installmentReceipts.length > 0 && <Receipts title="رسیدهای اقساط وام" rows={m.installmentReceipts} member={m} onChanged={reload} />}

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

      {/* loan edit / delete (admin) */}
      {m.loan && editLoan && (
        <LoanEditModal member={m} onClose={() => setEditLoan(false)} onSaved={async () => { setEditLoan(false); await reload(); }} />
      )}
      {m.loan && delLoan && (
        <ConfirmDelete
          title="حذف وام"
          body={<>آیا از حذف وام <strong>{m.name}</strong> (اصل <span className="mono">{fmt(m.loan.principal)}</span> تومان) مطمئن‌اید؟ همهٔ رسیدهای اقساط این وام نیز حذف می‌شوند و این کار قابل بازگشت نیست.</>}
          confirmLabel="حذف وام"
          onCancel={() => setDelLoan(false)}
          onConfirm={async () => {
            if (window.API && window.API.live) await window.API.deleteLoan({ memberId: m.id, loanId: m.loan.id });
            setDelLoan(false); await reload();
          }}
        />
      )}

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
