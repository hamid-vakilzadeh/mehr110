/* recordloan.jsx — ثبت وام (جدید یا از پیش‌موجود).
   «اقساط پرداخت‌شده» اجازه می‌دهد وام‌هایِ پیش از راه‌اندازی برنامه هم ثبت شوند:
   مانده = اصل − (اقساط پرداخت‌شده × قسط ماهانه)، به‌صورت معتبر ذخیره می‌شود. */

const FA_MONTHS_RL = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

function todayJalaliRL() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric', month: 'numeric', year: 'numeric', numberingSystem: 'latn' }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { d: get('day'), m: get('month'), y: get('year') };
}

const rlInput = {
  height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)',
  background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', width: '100%',
};

function RLSelect({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...rlInput, padding: '0 14px 0 34px', cursor: 'pointer', appearance: 'none' }}>
        {children}
      </select>
      <Icon name="chevron" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
    </div>
  );
}

function FieldRL({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</span>}
    </label>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} className="mono" placeholder={placeholder}
      style={{ ...rlInput, direction: 'ltr', textAlign: 'left' }} />
  );
}

function ToggleRL({ on, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      width: 46, height: 27, borderRadius: 99, border: 'none', cursor: 'pointer', flex: 'none',
      background: on ? 'var(--accent)' : 'var(--fill-2)', position: 'relative', transition: 'background .15s ease',
    }}>
      <span style={{ position: 'absolute', top: 3, [on ? 'left' : 'right']: 3, width: 21, height: 21, borderRadius: 99, background: 'var(--surface)', boxShadow: '0 1px 2px rgba(0,0,0,.18)' }} />
    </button>
  );
}

function RecordLoan() {
  const fund = window.FUND;
  const actives = fund.members.filter((m) => m.status === 'active');
  if (!actives.length) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '90px 22px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)' }}>عضوی برای ثبت وام نیست</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.8, margin: '8px 0 20px' }}>ابتدا یک عضو اضافه کنید، سپس می‌توانید وام ثبت کنید.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="add-member.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>افزودن عضو</a>
          <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();
  const [memberId, setMemberId] = React.useState(actives[0].id);
  const member = fund.members.find((m) => m.id === memberId) || actives[0];

  const [principal, setPrincipal] = React.useState('');
  const [term, setTerm] = React.useState(String(fund.settings.defaultInstallments || 20));
  const [paid, setPaid] = React.useState('');
  const [existing, setExisting] = React.useState(false);
  const today = React.useMemo(todayJalaliRL, []);
  const [d, setD] = React.useState(today.d);
  const [mo, setMo] = React.useState(today.m);
  const [yr, setYr] = React.useState(today.y);
  const [err, setErr] = React.useState('');
  const [saved, setSaved] = React.useState(null);

  const P = Number(principal) || 0;
  const term_ = Math.max(1, Number(term) || 1);
  const paid_ = Math.max(0, Math.min(term_, Number(paid) || 0));
  const monthly = P > 0 ? Math.round(P / term_) : 0;
  const outstanding = Math.max(0, P - paid_ * monthly);
  const pct = P > 0 ? Math.min(100, Math.round(((P - outstanding) / P) * 100)) : 0;
  const isExisting = existing || paid_ > 0; // a partly-paid loan is inherently pre-existing

  const submit = async () => {
    setErr('');
    if (!P) { setErr('مبلغ (اصل) وام را وارد کنید.'); return; }
    if (window.API && window.API.live) {
      try {
        const issuedAt = window.API.jalaliToMs(yr, mo, d);
        await window.API.issueLoan({
          memberId, principal: P, termMonths: term_, installmentsPaid: paid_,
          existing: isExisting, issuedAt,
        });
      } catch (e) {
        setErr('خطا در ثبت وام: ' + (e && e.message ? e.message : e));
        return;
      }
    }
    setSaved({
      name: member.name, principal: P, monthly, outstanding, paid: paid_, term: term_,
      date: `${faDigits(d)} ${FA_MONTHS_RL[mo - 1]} ${faDigits(yr)}`,
    });
    window.scrollTo(0, 0);
  };

  if (saved) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '70px 22px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Icon name="check" size={28} stroke={2} />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 23, color: 'var(--ink)', lineHeight: 1.4 }}>وام ثبت شد</h2>
          <p style={{ margin: '10px 0 20px', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            وامی به اصل <span className="mono" style={{ fontWeight: 600 }}>{fmt(saved.principal)}</span> تومان برای <strong>{saved.name}</strong> در {saved.date} ثبت شد.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>قسط ماهانه</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 3 }}>{fmt(saved.monthly)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>اقساط پرداخت‌شده</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 3 }}>{fmt(saved.paid)} از {fmt(saved.term)}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--accent)' }}>مانده</div><div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginTop: 3 }}>{fmt(saved.outstanding)}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26 }}>
            <button onClick={() => { setSaved(null); setPrincipal(''); setPaid(''); setExisting(false); }} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 }}>ثبت وام دیگر</button>
            <a href={`statement.html?m=${member.id}`} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>مشاهدهٔ صورت‌حساب</a>
            <a href="dashboard.html" style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>داشبورد</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 22px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div>
          <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 10 }}>
            <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
          </a>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 27, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>ثبت وام</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="coins" size={22} stroke={1.6} style={{ color: 'var(--surface)' }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FieldRL label="عضو وام‌گیرنده">
          <RLSelect value={memberId} onChange={setMemberId}>
            {actives.map((m) => <option key={m.id} value={m.id}>{m.name} — خانوادهٔ {m.family}</option>)}
          </RLSelect>
        </FieldRL>

        {/* member snapshot: eligibility + fund availability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>قابل وام‌دهی صندوق</div>
            <Money value={fund.kpis.available} unit="تومان" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', display: 'block', marginTop: 2 }} />
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
            padding: '4px 10px', borderRadius: 99,
            color: member.loanEligible ? 'var(--accent)' : 'var(--warn)',
            background: member.loanEligible ? 'var(--accent-soft)' : 'var(--warn-soft)',
            border: `1px solid ${member.loanEligible ? 'var(--accent-line)' : 'var(--warn-line)'}`,
          }}>
            <Icon name={member.loanEligible ? 'check' : 'alert'} size={13} stroke={2} />
            {member.loanEligible ? 'واجد شرایط وام' : 'واجد شرایط وام نیست'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 14 }}>
          <FieldRL label="اصل وام (تومان)">
            <NumInput value={principal} onChange={setPrincipal} placeholder="0" />
          </FieldRL>
          <FieldRL label="مدت بازپرداخت (ماه)">
            <NumInput value={term} onChange={setTerm} placeholder="20" />
          </FieldRL>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: 14 }}>
          <FieldRL label="اقساط پرداخت‌شده" hint="برای ثبت وام‌های پیشین">
            <NumInput value={paid} onChange={setPaid} placeholder="0" />
          </FieldRL>
          <FieldRL label="تاریخ پرداخت وام">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.2fr', gap: 8 }}>
              <RLSelect value={d} onChange={(v) => setD(Number(v))}>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faDigits(i + 1)}</option>)}
              </RLSelect>
              <RLSelect value={mo} onChange={(v) => setMo(Number(v))}>
                {FA_MONTHS_RL.map((mm, i) => <option key={i} value={i + 1}>{mm}</option>)}
              </RLSelect>
              <RLSelect value={yr} onChange={(v) => setYr(Number(v))}>
                {Array.from({ length: 30 }, (_, i) => today.y - i).map((y) => <option key={y} value={y}>{faDigits(y)}</option>)}
              </RLSelect>
            </div>
          </FieldRL>
        </div>

        {/* pre-existing override (auto-on when installments are already paid) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderRadius: 12, padding: '12px 16px' }}>
          <ToggleRL on={isExisting} onChange={(v) => setExisting(v)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>ثبت وام از پیش‌موجود</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>برای وام‌های پیش از برنامه؛ بدون بررسی واجد شرایط بودن و موجودی صندوق ثبت می‌شود.{paid_ > 0 ? ' (به‌خاطر اقساط پرداخت‌شده فعال است)' : ''}</div>
          </div>
        </div>

        {/* live preview */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>قسط ماهانه</div><Money value={monthly} style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }} /></div>
            <div><div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>مانده پس از ثبت</div><Money value={outstanding} style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }} /></div>
          </div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{faPct(pct)}٪ بازپرداخت‌شده</span>
        </div>

        {err && (
          <div style={{ fontSize: 12.5, color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="alert" size={14} stroke={1.8} /> {err}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>انصراف</a>
        <button onClick={submit} disabled={!P} style={{ height: 44, padding: '0 24px', borderRadius: 10, background: P ? 'var(--accent)' : 'var(--fill-2)', color: 'var(--surface)', border: 'none', cursor: P ? 'pointer' : 'not-allowed', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <Icon name="check" size={17} stroke={2} /> ثبت وام
        </button>
      </div>
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<RecordLoan />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
