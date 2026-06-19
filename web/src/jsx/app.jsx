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
  const [showReports, setShowReports] = React.useState(false);
  const { fund, ready } = useFund();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <img src="logo.png" alt="صندوق مهر۱۱۰" width={52} height={52} style={{ borderRadius: 14, display: 'block', flex: 'none', boxShadow: '0 1px 3px oklch(0.4 0.02 70 / 0.12)' }} />
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: isMobile ? 22 : 27, color: 'var(--ink)', lineHeight: 1.2 }}>صندوق مهر۱۱۰</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowReports(true)} title="گزارش‌ها" aria-label="گزارش‌ها" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40,
            borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer',
            color: 'var(--ink-2)', flex: 'none', font: 'inherit',
          }}>
            <Icon name="download" size={18} stroke={1.7} />
          </button>
          <a href="settings.html" title="تنظیمات" aria-label="تنظیمات" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40,
            borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', textDecoration: 'none',
            color: 'var(--ink-2)', flex: 'none',
          }}>
            <Icon name="settings" size={18} stroke={1.7} />
          </a>
          <button onClick={() => window.ffAuth && window.ffAuth.logout()} title="خروج از حساب" aria-label="خروج" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40,
            borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer',
            color: 'var(--ink-2)', flex: 'none', font: 'inherit',
          }}>
            <Icon name="logout" size={18} stroke={1.8} />
          </button>
        </div>
      </header>

      {/* ---- actions ---- */}
      {(() => {
        const base = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, boxSizing: 'border-box', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: 14, fontWeight: 600 };
        const primary = { ...base, background: 'var(--accent)', color: 'var(--surface)' };
        const secondary = { ...base, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--hair)' };
        const add = <a href="add-member.html" style={primary}><Icon name="userPlus" size={18} stroke={1.8} /> افزودن عضو</a>;
        const pay = <a href="record-payment.html" style={secondary}><Icon name="check" size={16} stroke={2} /> ثبت پرداخت</a>;
        const loan = <a href="record-loan.html" style={secondary}><Icon name="coins" size={16} stroke={1.7} /> ثبت وام</a>;
        return isMobile ? (
          // mobile: full-width «افزودن عضو», then «ثبت پرداخت» / «ثبت وام» split below
          <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {add}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{pay}{loan}</div>
          </div>
        ) : (
          // desktop: three equal buttons in one row
          <div style={{ marginBottom: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>{add}{pay}{loan}</div>
        );
      })()}

      {/* ---- attention alerts (only when something needs attention) ---- */}
      {ready && <AttentionCard fund={fund}
        onAttention={() => { setView('members'); window.dispatchEvent(new Event('focus-behind')); setTimeout(scrollToMembers, 60); }} />}
      {ready && <LoanAttentionCard fund={fund}
        onAttention={() => { setView('members'); window.dispatchEvent(new Event('focus-loan-behind')); setTimeout(scrollToMembers, 60); }} />}

      {/* ---- at a glance (starting section) ---- */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 16px' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>صندوق در یک نگاه</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
      </div>
      {ready ? <Composition fund={fund} /> : <ChartSkeleton isMobile={isMobile} />}

      {/* ---- three stat cards, one row, below the chart ---- */}
      {ready
        ? <StatRow fund={fund} isMobile={isMobile}
            onMembers={() => { setView('members'); setTimeout(scrollToMembers, 60); }} />
        : <StatRowSkeleton isMobile={isMobile} />}

      {/* ---- 3-month budget forecast (expected income: membership + installments) ---- */}
      {ready && (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '32px 0 16px' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>بودجهٔ سه ماه آینده</h2>
            <span style={{ flex: 1, height: 1, background: 'var(--hair)' }} />
          </div>
          <BudgetChart fund={fund} />
        </React.Fragment>
      )}

      {/* ---- workhorse: members / families (purchasing is now a filter inside) ---- */}
      <div id="members-section" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '40px 0 16px', scrollMarginTop: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', lineHeight: 1.3 }}>
          {view === 'members' ? 'همهٔ اعضا' : 'همهٔ خانواده‌ها'}
        </h2>
        <Segmented value={view} onChange={setView} options={[
          { key: 'members', label: 'اعضا', icon: 'rows' },
          { key: 'families', label: 'بر اساس خانواده', icon: 'grid' },
        ]} />
      </div>

      {!ready
        ? <MembersTableSkeleton isMobile={isMobile} />
        : (view === 'members' ? <MembersTable fund={fund} isMobile={isMobile} /> : <FamilyView fund={fund} isMobile={isMobile} />)}

      {/* ---- reports menu (fund-level PDF reports) ---- */}
      {showReports && <ReportsMenu onClose={() => setShowReports(false)} />}

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
if (window.API && window.API.boot) window.API.boot(__mount, { eager: true }); else __mount();
