/* app.jsx — The Family Fund dashboard shell. */

const SERIF_FONTS = {
  'Amiri': "'Amiri', 'Vazirmatn', serif",
  'Markazi': "'Markazi Text', 'Vazirmatn', serif",
  'Vazirmatn': "'Vazirmatn', sans-serif",
  'Gulzar': "'Gulzar', 'Vazirmatn', serif",
};
const ACCENTS = {
  'Evergreen': 'oklch(0.46 0.078 158)',
  'Brass':     'oklch(0.535 0.082 78)',
  'Ink teal':  'oklch(0.48 0.072 224)',
  'Oxblood':   'oklch(0.43 0.10 25)',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "serif": "Vazirmatn",
  "accent": "Evergreen"
}/*EDITMODE-END*/;

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 14px',
            border: 'none', borderRadius: 7, cursor: 'pointer', font: 'inherit', fontFamily: 'var(--sans)',
            fontSize: 13.5, fontWeight: 600,
            color: active ? 'var(--ink)' : 'var(--ink-3)',
            background: active ? 'var(--surface)' : 'transparent',
            boxShadow: active ? '0 1px 3px oklch(0.4 0.02 70 / 0.10)' : 'none',
          }}>
            <Icon name={o.icon} size={15} stroke={1.7} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState('members');
  const fund = window.FUND;
  const isMobile = useIsMobile();
  const scrollToMembers = () => {
    const el = document.getElementById('members-section');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
  };

  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--serif', SERIF_FONTS[t.serif] || SERIF_FONTS.Fraunces);
    r.style.setProperty('--accent', ACCENTS[t.accent] || ACCENTS.Evergreen);
  }, [t.serif, t.accent]);

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', padding: isMobile ? '18px 16px 72px' : '28px 32px 80px' }}>
      {/* ---- quiet header ---- */}
      <header style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: isMobile ? 18 : 28, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="coins" size={21} stroke={1.6} style={{ color: 'var(--surface)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 30, color: 'var(--ink)', lineHeight: 1.15, whiteSpace: 'nowrap' }}>صندوق مهر۱۱۰</h1>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 5 }}>حلقهٔ پس‌انداز و وام خانوادگی</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="add-member.html" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px',
            borderRadius: 10, background: 'var(--accent)', color: 'var(--surface)', textDecoration: 'none',
            fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <Icon name="userPlus" size={16} stroke={1.8} /> افزودن عضو
          </a>
          {!isMobile && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', border: '1px solid var(--hair)', borderRadius: 99, padding: '5px 11px', whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--fill-1)' }} />فقط خواندنی
          </span>}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>تا تاریخِ</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginTop: 2 }}>{fund.meta.asOf}</div>
          </div>
          <button onClick={() => window.ffAuth && window.ffAuth.logout()} title="خروج از حساب" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 13px',
            borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer',
            font: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap',
          }}>
            <Icon name="logout" size={16} stroke={1.8} /> خروج
          </button>
        </div>
      </header>

      {/* ---- settings strip (informational, drives no balances) ---- */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 20,
        background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '4px 4px',
      }}>
        {[
          ['حق عضویت ماهانه', `${fmt(fund.settings.membershipFee)} تومان`, 'coins'],
          ['اقساط پیش‌فرض سهم', fmt(fund.settings.defaultInstallments), 'rows'],
          ['ارزش کامل سهم (این ماه)', `${fmt(fund.settings.parValue)} تومان`, 'star'],
          ['ماه آینده', `${fmt(fund.settings.parNext)} تومان`, 'arrowUpRight'],
        ].map(([label, val, icon], i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderInlineStart: i ? '1px solid var(--hair-2)' : 'none', flex: '1 1 auto', minWidth: 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={icon} size={15} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{label}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{val}</div>
            </div>
          </div>
        ))}
        <a href="record-payment.html" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', margin: '0 6px',
          borderRadius: 9, background: 'var(--surface-2)', color: 'var(--ink)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid var(--hair)',
        }}>
          <Icon name="check" size={15} stroke={2} /> ثبت پرداخت
        </a>
      </div>

      {/* ---- KPI band ---- */}
      <KpiBand fund={fund}
        onAttention={() => { setView('members'); window.dispatchEvent(new Event('focus-behind')); setTimeout(scrollToMembers, 60); }}
        onMembers={() => { setView('members'); setTimeout(scrollToMembers, 60); }} />

      {/* ---- at a glance ---- */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '36px 0 16px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>صندوق در یک نگاه</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      </div>
      <div style={{
        display: 'grid', gap: 14,
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 0.92fr',
        gridTemplateAreas: isMobile ? `"comp" "fam" "queue"` : `"comp fam queue"`,
        alignItems: 'start',
      }}>
        <div style={{ gridArea: 'comp' }}><Composition fund={fund} /></div>
        <div style={{ gridArea: 'fam' }}><FamilyBars fund={fund} /></div>
        <div style={{ gridArea: 'queue' }}><RotationQueue fund={fund} /></div>
      </div>

      {/* ---- share purchase tracker ---- */}
      <PurchaseTracker fund={fund} isMobile={isMobile} />

      {/* ---- workhorse: members / families ---- */}
      <div id="members-section" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '40px 0 16px', scrollMarginTop: 16 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          {view === 'members' ? 'همهٔ اعضا' : 'همهٔ خانواده‌ها'}
        </h2>
        <Segmented value={view} onChange={setView} options={[
          { key: 'members', label: 'اعضا', icon: 'rows' },
          { key: 'families', label: 'بر اساس خانواده', icon: 'grid' },
        ]} />
      </div>

      {view === 'members' ? <MembersTable fund={fund} isMobile={isMobile} /> : <FamilyView fund={fund} isMobile={isMobile} />}

      {/* ---- Tweaks ---- */}
      <TweaksPanel>
        <TweakSection label="قلم تیتر" />
        <TweakSelect label="قلم" value={t.serif} options={Object.keys(SERIF_FONTS)} onChange={(v) => setTweak('serif', v)} />
        <TweakSection label="رنگ شاخص پول" />
        <TweakColor label="رنگ" value={ACCENTS[t.accent]}
          options={Object.values(ACCENTS)}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k] === v) || 'Evergreen';
            setTweak('accent', key);
          }} />
      </TweaksPanel>
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<App />); }
if (window.API && window.API.boot) window.API.boot(__mount); else __mount();
