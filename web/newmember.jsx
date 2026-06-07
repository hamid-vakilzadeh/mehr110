/* newmember.jsx — فرم افزودن عضو جدید (سطح مدیر).
   نام، تاریخ تولد، شماره‌های تماس و شماره‌حساب‌های تکرارشونده، خانواده، سهم.
   داده برای ذخیره در Firebase/Firestore آماده می‌شود (collection: members). */

const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

function Field({ label, hint, required, children, full }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: full ? '1 / -1' : 'auto' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
        {label}{required && <span style={{ color: 'var(--warn)', marginInlineStart: 4 }}>*</span>}
        {!required && <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginInlineStart: 6, fontSize: 12 }}>(اختیاری)</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)',
  background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', width: '100%',
};

function TextInput({ value, onChange, placeholder, invalid, mono }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={mono ? 'mono' : ''}
      style={{ ...inputStyle, borderColor: invalid ? 'var(--warn)' : 'var(--hair)', background: invalid ? 'var(--warn-soft)' : 'var(--surface)' }} />
  );
}

function Select({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, padding: '0 14px 0 34px', cursor: 'pointer', appearance: 'none' }}>
        {children}
      </select>
      <Icon name="chevron" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
    </div>
  );
}

/* repeatable list of inputs (phones / account numbers) */
function RepeatList({ items, setItems, placeholder, addLabel, mono, kind }) {
  const update = (i, v) => setItems(items.map((it, idx) => (idx === i ? v : it)));
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, '']);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name={kind === 'phone' ? 'user' : 'coins'} size={14} />
          </span>
          <input value={it} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} className={mono ? 'mono' : ''}
            style={{ ...inputStyle, height: 40, direction: mono ? 'ltr' : 'rtl', textAlign: mono ? 'left' : 'right' }} />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(i)} title="حذف"
              style={{ width: 40, height: 40, flex: 'none', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px',
        borderRadius: 8, border: '1px dashed var(--accent-line)', background: 'transparent', cursor: 'pointer',
        font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {addLabel}
      </button>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      width: 46, height: 27, borderRadius: 99, border: 'none', cursor: 'pointer', flex: 'none',
      background: on ? 'var(--accent)' : 'var(--fill-2)', position: 'relative', transition: 'background .15s ease',
    }}>
      <span style={{ position: 'absolute', top: 3, [on ? 'left' : 'right']: 3, width: 21, height: 21, borderRadius: 99, background: 'var(--surface)', boxShadow: '0 1px 2px rgba(0,0,0,.18)' }} />
    </button>
  );
}

function AddMember() {
  const isMobile = useIsMobile();
  const fund = window.FUND;
  const editId = new URLSearchParams(location.search).get('edit');
  const editM = editId ? fund.members.find((x) => x.id === editId) : null;
  const isEdit = !!editM;
  const np = editM ? editM.name.trim().split(' ') : [];
  const [first, setFirst] = React.useState(editM ? np[0] : '');
  const [last, setLast] = React.useState(editM ? np.slice(1).join(' ') : '');
  const [dobD, setDobD] = React.useState('');
  const [dobM, setDobM] = React.useState('');
  const [dobY, setDobY] = React.useState('');
  const [phones, setPhones] = React.useState(editM ? editM.phones.map((p) => faDigits(p)) : ['']);
  const [accounts, setAccounts] = React.useState(editM ? editM.accounts.map((a) => faDigits(a)) : ['']);
  const [referrer, setReferrer] = React.useState(editM && editM.referredBy ? editM.referredBy : '');
  const [shares, setShares] = React.useState(editM ? editM.nShares : 1);
  const [active, setActive] = React.useState(editM ? editM.status === 'active' : true);
  const [tried, setTried] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const firstInvalid = tried && !first.trim();
  const lastInvalid = tried && !last.trim();

  const submit = async () => {
    setTried(true);
    if (!first.trim() || !last.trim()) {
      document.querySelector('.formcard').scrollIntoView({ block: 'start' });
      return;
    }
    if (window.API && window.API.live) {
      try {
        const dob = (dobY && dobM && dobD) ? window.API.jalaliToMs(dobY, dobM, dobD) : null;
        const payload = {
          firstName: first.trim(), lastName: last.trim(), family: last.trim(),
          dob, phones: phones.filter((p) => p.trim()), accounts: accounts.filter((a) => a.trim()),
          referredBy: referrer.trim() || null, status: active ? 'active' : 'inactive',
        };
        if (isEdit) { await window.API.updateMember({ id: editM.id, ...payload }); }
        else { await window.API.createMember({ ...payload, initialShares: shares }); }
      } catch (e) {
        alert('خطا در ذخیره: ' + (e && e.message ? e.message : e));
        return;
      }
    }
    setSaved(true);
  };

  const reset = () => {
    setFirst(''); setLast(''); setDobD(''); setDobM(''); setDobY('');
    setPhones(['']); setAccounts(['']); setReferrer(''); setShares(1);
    setActive(true); setTried(false); setSaved(false);
    window.scrollTo(0, 0);
  };

  if (saved) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px' }}>
        <div className="formcard" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '44px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Icon name="check" size={28} stroke={2} />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 24, color: 'var(--ink)', lineHeight: 1.4 }}>{isEdit ? 'تغییرات ذخیره شد' : 'عضو جدید ثبت شد'}</h2>
          <p style={{ margin: '10px 0 4px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            {isEdit
              ? <>اطلاعات <strong>{first} {last}</strong> به‌روزرسانی شد.</>
              : <><strong>{first} {last}</strong> به خانوادهٔ {last} افزوده شد.</>}
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>این رکورد در مجموعهٔ <span className="mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>members</span> فایربیس ذخیره می‌شود.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
            {isEdit
              ? <a href={`statement.html?m=${editM.id}`} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>مشاهدهٔ صورت‌حساب</a>
              : <button onClick={reset} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600 }}>افزودن عضو دیگر</button>}
            <a href="dashboard.html" style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>بازگشت به داشبورد</a>
          </div>
        </div>
      </div>
    );
  }

  const sectionTitle = (t) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 2px' }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{t}</h3>
      <span style={{ flex: 1, height: 1, background: 'var(--hair-2)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 10 }}>
            <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
          </a>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 28, color: 'var(--ink)', lineHeight: 1.3 }}>{isEdit ? 'ویرایش عضو' : 'افزودن عضو جدید'}</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Icon name={isEdit ? 'edit' : 'userPlus'} size={22} stroke={1.7} style={{ color: 'var(--surface)' }} />
        </div>
      </div>

      <div className="formcard" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* identity */}
        {sectionTitle('مشخصات فردی')}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <Field label="نام" required>
            <TextInput value={first} onChange={setFirst} placeholder="مثلاً مریم" invalid={firstInvalid} />
          </Field>
          <Field label="نام خانوادگی" required>
            <TextInput value={last} onChange={setLast} placeholder="مثلاً حسینی" invalid={lastInvalid} />
          </Field>
          <Field label="تاریخ تولد" full hint="تاریخ شمسی">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 10 }}>
              <Select value={dobD} onChange={setDobD}>
                <option value="">روز</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faDigits(i + 1)}</option>)}
              </Select>
              <Select value={dobM} onChange={setDobM}>
                <option value="">ماه</option>
                {FA_MONTHS.map((mo, i) => <option key={i} value={i + 1}>{mo}</option>)}
              </Select>
              <Select value={dobY} onChange={setDobY}>
                <option value="">سال</option>
                {Array.from({ length: 85 }, (_, i) => 1404 - i).map((y) => <option key={y} value={y}>{faDigits(y)}</option>)}
              </Select>
            </div>
          </Field>
          <Field label="معرف" hint="عضوی که این فرد را معرفی کرده (اختیاری)">
            <TextInput value={referrer} onChange={setReferrer} placeholder="مثلاً رضا کریمی" />
          </Field>
        </div>

        {/* contact — repeatable */}
        {sectionTitle('راه‌های تماس')}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <Field label="شماره تماس" hint="برای افزودن شمارهٔ دوم روی دکمه بزنید">
            <RepeatList items={phones} setItems={setPhones} kind="phone" mono placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" addLabel="افزودن شمارهٔ دیگر" />
          </Field>
          <Field label="شماره حساب" hint="عضو ممکن است چند حساب داشته باشد">
            <RepeatList items={accounts} setItems={setAccounts} kind="account" mono placeholder="۱۲۳۴-۵۶۷۸-۹۰" addLabel="افزودن حساب دیگر" />
          </Field>
        </div>

        {/* membership */}
        {sectionTitle('عضویت و سهم')}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <Field label="تعداد سهم اولیه">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--hair)', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
              <button type="button" onClick={() => setShares(Math.max(0, shares - 1))} style={{ width: 42, height: 42, border: 'none', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 20, color: 'var(--ink)' }}>−</button>
              <span className="mono" style={{ width: 56, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{faDigits(shares)}</span>
              <button type="button" onClick={() => setShares(shares + 1)} style={{ width: 42, height: 42, border: 'none', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 20, color: 'var(--ink)' }}>+</button>
            </div>
          </Field>
          <Field label="وضعیت">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 42 }}>
              <Toggle on={active} onChange={setActive} />
              <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{active ? 'فعال' : 'غیرفعال'}</span>
            </div>
          </Field>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>فیلدهای دارای <span style={{ color: 'var(--warn)' }}>*</span> الزامی‌اند</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="dashboard.html" style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--hair)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>انصراف</a>
          <button onClick={submit} style={{ height: 44, padding: '0 24px', borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <Icon name="check" size={17} stroke={2} /> {isEdit ? 'ذخیره تغییرات' : 'ثبت عضو'}
          </button>
        </div>
      </div>
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<AddMember />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
