/* settings.jsx — تنظیمات: نام مدیر + مقادیر پیش‌فرض/اطلاعاتی صندوق (قابل ویرایش). */

const sInput = {
  height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)',
  background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', width: '100%',
};

function SCard({ title, icon, children }) {
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={icon} size={17} /></span>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SField({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>{hint}</span>}
    </label>
  );
}

function NumberField({ label, hint, value, onChange, readOnly }) {
  return (
    <SField label={label} hint={hint}>
      <input value={value} readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        className="mono"
        style={{ ...sInput, direction: 'ltr', textAlign: 'left', color: readOnly ? 'var(--ink-3)' : 'var(--ink)', background: readOnly ? 'var(--surface-2)' : 'var(--surface)' }} />
    </SField>
  );
}

function SaveBtn({ state, onClick, children }) {
  const saving = state === 'saving', saved = state === 'saved';
  return (
    <button onClick={onClick} disabled={saving} style={{
      height: 44, padding: '0 22px', borderRadius: 10, border: 'none', cursor: saving ? 'default' : 'pointer',
      background: saved ? 'var(--ink)' : 'var(--accent)', color: 'var(--surface)', font: 'inherit', fontSize: 14, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', opacity: saving ? 0.8 : 1,
    }}>
      <Icon name={saved ? 'check' : 'check'} size={16} stroke={2} />
      {saving ? 'در حال ذخیره…' : saved ? 'ذخیره شد' : children}
    </button>
  );
}

function ErrLine({ msg }) {
  if (!msg) return null;
  return <div style={{ fontSize: 12.5, color: 'var(--warn)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="alert" size={14} stroke={1.8} /> {msg}</div>;
}

function Settings() {
  const fund = window.FUND;
  const isMobile = useIsMobile();
  const s = fund.settings;
  const api = window.API || {};

  const [name, setName] = React.useState((api.adminName && api.adminName()) || '');
  const email = (api.adminEmail && api.adminEmail()) || '';
  const [nameState, setNameState] = React.useState('idle');
  const [nameErr, setNameErr] = React.useState('');

  const [fee, setFee] = React.useState(String(s.membershipFee));
  const [inst, setInst] = React.useState(String(s.defaultInstallments));
  const [par, setPar] = React.useState(String(s.parValue));
  const [setState, setSetState] = React.useState('idle');
  const [setErr, setSetErr] = React.useState('');

  const parNext = (Number(par) || 0) + (Number(fee) || 0);

  const saveName = async () => {
    if (!name.trim()) { setNameErr('نام را وارد کنید.'); return; }
    setNameErr(''); setNameState('saving');
    try { await api.setAdminName(name.trim()); setNameState('saved'); setTimeout(() => setNameState('idle'), 2200); }
    catch (e) { setNameErr('خطا در ذخیره: ' + (e && e.message ? e.message : e)); setNameState('idle'); }
  };

  const saveSettings = async () => {
    if (!(Number(inst) > 0) || !(Number(par) > 0)) { setSetErr('اقساط و ارزش سهم باید بزرگ‌تر از صفر باشند.'); return; }
    setSetErr(''); setSetState('saving');
    try {
      await api.updateSettings({ membershipFee: Number(fee) || 0, defaultInstallments: Number(inst), parValue: Number(par) });
      setSetState('saved'); setTimeout(() => setSetState('idle'), 2200);
    } catch (e) { setSetErr('خطا در ذخیره: ' + (e && e.message ? e.message : e)); setSetState('idle'); }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 22px 70px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <div>
          <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 10 }}>
            <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
          </a>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 27, color: 'var(--ink)', lineHeight: 1.3 }}>تنظیمات</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name="settings" size={22} stroke={1.7} style={{ color: 'var(--surface)' }} />
        </div>
      </div>

      {/* admin account */}
      <SCard title="حساب مدیر" icon="user">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SField label="نام مدیر" hint="این نام در سوابق ثبت تراکنش‌ها و وام‌ها نمایش داده می‌شود.">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً مریم حسینی" style={sInput} />
          </SField>
          {email && (
            <SField label="ایمیل ورود">
              <input value={email} readOnly className="mono" style={{ ...sInput, direction: 'ltr', textAlign: 'left', color: 'var(--ink-3)', background: 'var(--surface-2)' }} />
            </SField>
          )}
          <ErrLine msg={nameErr} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><SaveBtn state={nameState} onClick={saveName}>ذخیرهٔ نام</SaveBtn></div>
        </div>
      </SCard>

      {/* fund settings / informational defaults */}
      <SCard title="مقادیر و تنظیمات صندوق" icon="settings">
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.8 }}>
          این مقادیر اطلاعاتی‌اند و موجودی‌های ذخیره‌شده را بازمحاسبه نمی‌کنند — فقط مقادیر پیش‌فرض فرم‌ها و معیار «تأمین کامل سهم» را تعیین می‌کنند.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <NumberField label="حق عضویت ماهانه (تومان)" value={fee} onChange={setFee} />
          <NumberField label="اقساط پیش‌فرض سهم" value={inst} onChange={setInst} />
          <NumberField label="ارزش کامل سهم — این ماه (تومان)" value={par} onChange={setPar} />
          <NumberField label="ماه آینده (تومان)" value={String(parNext)} readOnly hint="ارزش کامل سهم + حق عضویت ماهانه" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <ErrLine msg={setErr} />
          <div style={{ marginInlineStart: 'auto' }}><SaveBtn state={setState} onClick={saveSettings}>ذخیرهٔ تنظیمات</SaveBtn></div>
        </div>
      </SCard>
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<Settings />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
