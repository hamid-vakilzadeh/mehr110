/* recordpayment.jsx — ثبت پرداخت: «پس‌انداز» (افزایش پس‌انداز عضو) یا «قسط وام»
   (کاهش ماندهٔ وام). مبلغ آزاد است؛ عضو می‌تواند بیش از حداقل بپردازد و سیستم
   مانده را بر اساس «مبلغ پرداختی» نگه می‌دارد، نه تعداد اقساط. */

const FA_MONTHS_RP = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

function todayJalali() {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { day: 'numeric', month: 'numeric', year: 'numeric', numberingSystem: 'latn' }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { d: get('day'), m: get('month'), y: get('year') };
}

const rpInput = {
  height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)',
  background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', width: '100%',
};

function RPSelect({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...rpInput, padding: '0 14px 0 34px', cursor: 'pointer', appearance: 'none' }}>
        {children}
      </select>
      <Icon name="chevron" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
    </div>
  );
}

function FieldRP({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</span>}
    </label>
  );
}

function Segmented2({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} style={{
            flex: 1, height: 38, border: 'none', borderRadius: 7, cursor: 'pointer', font: 'inherit',
            fontSize: 13.5, fontWeight: 600, color: active ? 'var(--ink)' : 'var(--ink-3)',
            background: active ? 'var(--surface)' : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(80,70,50,.1)' : 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <Icon name={o.icon} size={15} stroke={1.7} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

function RecordPayment() {
  const fund = window.FUND;
  const actives = fund.members.filter((m) => m.status === 'active');
  if (!actives.length) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '90px 22px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)' }}>عضوی برای ثبت پرداخت نیست</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.8, margin: '8px 0 20px' }}>ابتدا یک عضو اضافه کنید، سپس می‌توانید پرداخت ثبت کنید.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="add-member.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>افزودن عضو</a>
          <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
        </div>
      </div>
    );
  }
  const isMobile = useIsMobile();
  const FEE = fund.settings.membershipFee;
  const PAR = fund.settings.parValue;

  const defId = (fund.purchasing[0] || actives[0]).id;
  const [memberId, setMemberId] = React.useState(defId);
  const member = fund.members.find((m) => m.id === memberId) || actives[0];
  const hasLoan = !!member.loan;

  const [type, setType] = React.useState('savings'); // savings | loan
  const [amount, setAmount] = React.useState(FEE);
  const today = React.useMemo(todayJalali, []);
  const [d, setD] = React.useState(today.d);
  const [mo, setMo] = React.useState(today.m);
  const [yr, setYr] = React.useState(today.y);
  const [saved, setSaved] = React.useState(null);

  // keep the type valid for the selected member; set a sensible default amount
  React.useEffect(() => {
    if (type === 'loan' && !hasLoan) { setType('savings'); return; }
    setAmount(type === 'loan' && member.loan ? member.loan.monthly : FEE);
  }, [type, memberId]);

  const amt = Number(amount) || 0;
  const isLoan = type === 'loan' && hasLoan;
  const oldVal = isLoan ? member.loan.outstanding : member.seedBalance;
  const newVal = isLoan ? Math.max(0, member.loan.outstanding - amt) : member.seedBalance + amt;
  const nowEligible = !isLoan && member.seedBalance < PAR && member.seedBalance + amt >= PAR;
  const loanCleared = isLoan && newVal === 0;

  const submit = async () => {
    if (window.API && window.API.live) {
      try {
        const date = window.API.jalaliToMs(yr, mo, d);
        if (isLoan) await window.API.recordInstallment({ memberId, loanId: member.loan.id, amount: amt, date });
        else await window.API.recordSeed({ memberId, amount: amt, date });
      } catch (e) { alert('خطا در ثبت پرداخت: ' + (e && e.message ? e.message : e)); return; }
    }
    setSaved({ name: member.name, amount: amt, isLoan, oldVal, newVal, nowEligible, loanCleared, date: `${faDigits(d)} ${FA_MONTHS_RP[mo - 1]} ${faDigits(yr)}` });
    window.scrollTo(0, 0);
  };

  if (saved) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '70px 22px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Icon name="check" size={28} stroke={2} />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 23, color: 'var(--ink)', lineHeight: 1.4 }}>پرداخت ثبت شد</h2>
          <p style={{ margin: '10px 0 20px', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            {saved.isLoan ? 'قسط وام' : 'پس‌انداز'} به مبلغ <span className="mono" style={{ fontWeight: 600 }}>{fmt(saved.amount)}</span> تومان برای <strong>{saved.name}</strong> در {saved.date} ثبت شد.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px' }}>
            <div><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{saved.isLoan ? 'ماندهٔ پیشین' : 'پس‌انداز پیشین'}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-3)', marginTop: 3 }}>{fmt(saved.oldVal)}</div></div>
            <Icon name="arrowR" size={18} stroke={1.8} style={{ color: 'var(--ink-3)', transform: 'scaleX(-1)' }} />
            <div><div style={{ fontSize: 11, color: 'var(--accent)' }}>{saved.isLoan ? 'ماندهٔ جدید' : 'پس‌انداز جدید'}</div><div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginTop: 3 }}>{fmt(saved.newVal)}</div></div>
          </div>
          {saved.nowEligible && (
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={15} stroke={2.2} /> این عضو اکنون واجد شرایط وام است.
            </div>
          )}
          {saved.loanCleared && (
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={15} stroke={2.2} /> این وام به‌طور کامل بازپرداخت شد.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26 }}>
            <button onClick={() => setSaved(null)} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 }}>ثبت پرداخت دیگر</button>
            <a href="dashboard.html" style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
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
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 27, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>ثبت پرداخت</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="coins" size={22} stroke={1.6} style={{ color: 'var(--surface)' }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FieldRP label="عضو">
          <RPSelect value={memberId} onChange={setMemberId}>
            {actives.map((m) => <option key={m.id} value={m.id}>{m.name} — خانوادهٔ {m.family}</option>)}
          </RPSelect>
        </FieldRP>

        {/* member snapshot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>پس‌انداز فعلی</div>
            <Money value={member.seedBalance} unit="تومان" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', display: 'block', marginTop: 2 }} />
          </div>
          {hasLoan && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>ماندهٔ وام</div>
              <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-2)', marginTop: 2 }}>{fmt(member.loan.outstanding)}</div>
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>تأمین</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: member.fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)', marginTop: 2 }}>{faPct(member.fundedPct)}٪</div>
          </div>
        </div>

        <FieldRP label="نوع پرداخت">
          <Segmented2 value={type} onChange={setType} options={hasLoan
            ? [{ key: 'savings', label: 'پس‌انداز', icon: 'coins' }, { key: 'loan', label: 'قسط وام', icon: 'arrowUpRight' }]
            : [{ key: 'savings', label: 'پس‌انداز', icon: 'coins' }]} />
        </FieldRP>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: 14 }}>
          <FieldRP label="مبلغ (تومان)" hint={isLoan ? `قسط ماهانه: ${fmt(member.loan.monthly)} — می‌توانید بیشتر بپردازید` : `حق عضویت: ${fmt(FEE)} — مبلغ آزاد است`}>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} className="mono"
              style={{ ...rpInput, direction: 'ltr', textAlign: 'left' }} />
          </FieldRP>
          <FieldRP label="تاریخ پرداخت">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.2fr', gap: 8 }}>
              <RPSelect value={d} onChange={(v) => setD(Number(v))}>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faDigits(i + 1)}</option>)}
              </RPSelect>
              <RPSelect value={mo} onChange={(v) => setMo(Number(v))}>
                {FA_MONTHS_RP.map((mm, i) => <option key={i} value={i + 1}>{mm}</option>)}
              </RPSelect>
              <RPSelect value={yr} onChange={(v) => setYr(Number(v))}>
                {Array.from({ length: 3 }, (_, i) => today.y - i).map((y) => <option key={y} value={y}>{faDigits(y)}</option>)}
              </RPSelect>
            </div>
          </FieldRP>
        </div>

        {/* live preview */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{isLoan ? 'ماندهٔ وام پس از این پرداخت' : 'پس‌انداز پس از این پرداخت'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Money value={newVal} style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>تومان</span>
          </div>
        </div>
        {nowEligible && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: -6 }}>
            <Icon name="check" size={14} stroke={2.2} /> با این پرداخت، این عضو واجد شرایط وام می‌شود.
          </div>
        )}
        {loanCleared && (
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: -6 }}>
            <Icon name="check" size={14} stroke={2.2} /> با این پرداخت، وام به‌طور کامل بازپرداخت می‌شود.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>انصراف</a>
        <button onClick={submit} disabled={!amt} style={{ height: 44, padding: '0 24px', borderRadius: 10, background: amt ? 'var(--accent)' : 'var(--fill-2)', color: 'var(--surface)', border: 'none', cursor: amt ? 'pointer' : 'not-allowed', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <Icon name="check" size={17} stroke={2} /> ثبت پرداخت
        </button>
      </div>
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<RecordPayment />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
