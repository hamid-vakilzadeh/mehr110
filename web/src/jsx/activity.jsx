/* activity.jsx — گزارش فعالیت‌ها: an append-only feed of every recorded action
   (payments, loans, members, shares, loan-turn, settings), newest first,
   grouped by Jalali day. Reads the `activityList` callable (paginated). Admin-only. */

const jDayFmt = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', year: 'numeric', month: 'long', day: 'numeric' });
const jTimeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayLabel = (ms) => (ms ? jDayFmt.format(new Date(ms)) : '—');
const timeLabel = (ms) => (ms ? jTimeFmt.format(new Date(ms)) : '');

/* action key → category + icon + color (delete is always the warn color) */
function actionMeta(action) {
  const a = String(action || '');
  const del = a.endsWith('.delete');
  if (a.startsWith('payment')) return { cat: 'payment', icon: del ? 'trash' : 'check', color: del ? 'var(--warn)' : 'var(--accent)' };
  if (a.startsWith('loanorder')) return { cat: 'order', icon: 'grip', color: 'var(--ink-2)' };
  if (a.startsWith('loan')) return { cat: 'loan', icon: del ? 'trash' : 'banknote', color: del ? 'var(--warn)' : 'var(--accent)' };
  if (a.startsWith('member')) return { cat: 'member', icon: del ? 'trash' : a.endsWith('.create') ? 'userPlus' : 'edit', color: del ? 'var(--warn)' : a.endsWith('.create') ? 'var(--accent)' : 'var(--ink-2)' };
  if (a.startsWith('share')) return { cat: 'share', icon: 'grid', color: 'var(--ink-2)' };
  if (a.startsWith('settings')) return { cat: 'settings', icon: 'settings', color: 'var(--ink-2)' };
  return { cat: 'other', icon: 'clock', color: 'var(--ink-3)' };
}

const CHIPS = [
  { key: 'all', label: 'همه' },
  { key: 'payment', label: 'پرداخت‌ها' },
  { key: 'loan', label: 'وام‌ها' },
  { key: 'member', label: 'اعضا', cats: ['member', 'share'] },
  { key: 'order', label: 'نوبت وام' },
  { key: 'settings', label: 'تنظیمات' },
];
const chipMatches = (chip, cat) => chip.key === 'all' || cat === chip.key || (chip.cats && chip.cats.indexOf(cat) !== -1);

function ActivityRow({ e, isMobile }) {
  const m = actionMeta(e.action);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px' }}>
      <span style={{
        width: 30, height: 30, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center',
        color: m.color, background: m.color === 'var(--warn)' ? 'var(--warn-soft)' : m.color === 'var(--accent)' ? 'var(--accent-soft)' : 'var(--surface-2)',
        border: `1px solid ${m.color === 'var(--warn)' ? 'var(--warn-line)' : m.color === 'var(--accent)' ? 'var(--accent-line)' : 'var(--hair)'}`,
      }}>
        <Icon name={m.icon} size={15} stroke={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>{e.summary}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="clock" size={12} stroke={1.7} />{timeLabel(e.recordedAt)}</span>
          {e.recordedByName && <span>· {e.recordedByName}</span>}
        </div>
      </div>
    </div>
  );
}

function ActivityLogSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '8px 16px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: i < 7 ? '1px solid var(--hair-2)' : 'none' }}>
          <Skel width={30} height={30} radius={9} />
          <div style={{ flex: 1 }}>
            <Skel width={`${55 + (i % 4) * 9}%`} height={13} radius={5} />
            <Skel width={120} height={10} radius={5} style={{ marginTop: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityLog() {
  const isMobile = useIsMobile();
  const [entries, setEntries] = React.useState([]);
  const [cursor, setCursor] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [more, setMore] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [cat, setCat] = React.useState('all');
  const [q, setQ] = React.useState('');

  // optional ?m=<id> scopes the log to one member (client-side filter on loaded rows)
  const memberId = React.useMemo(() => new URLSearchParams(location.search).get('m') || '', []);

  const load = React.useCallback((before) => {
    const first = !before;
    if (first) setLoading(true); else setMore(true);
    window.API.activityList({ limit: 50, before })
      .then((res) => {
        const rows = (res && res.entries) || [];
        setEntries((prev) => (first ? rows : prev.concat(rows)));
        setCursor((res && res.cursor) || null);
        setErr('');
      })
      .catch((e) => setErr((e && e.message) || 'خطا در بارگذاری گزارش فعالیت‌ها'))
      .finally(() => { setLoading(false); setMore(false); });
  }, []);

  React.useEffect(() => { load(null); }, [load]);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (memberId && (!e.meta || e.meta.memberId !== memberId)) return false;
      const chip = CHIPS.find((c) => c.key === cat) || CHIPS[0];
      if (!chipMatches(chip, actionMeta(e.action).cat)) return false;
      if (needle && String(e.summary || '').toLowerCase().indexOf(needle) === -1
        && String(e.recordedByName || '').toLowerCase().indexOf(needle) === -1) return false;
      return true;
    });
  }, [entries, cat, q, memberId]);

  // group consecutive (already-sorted desc) rows by Jalali day
  const groups = React.useMemo(() => {
    const out = [];
    let cur = null;
    for (const e of shown) {
      const d = dayLabel(e.recordedAt);
      if (!cur || cur.day !== d) { cur = { day: d, items: [] }; out.push(cur); }
      cur.items.push(e);
    }
    return out;
  }, [shown]);

  const ghost = {
    height: 40, padding: '0 13px', borderRadius: 10, cursor: 'pointer', font: 'inherit', flex: 'none',
    display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
    border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--ink-2)',
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: isMobile ? '20px 16px 70px' : '28px 24px 80px' }}>
      {/* header */}
      <div style={{ marginBottom: 18 }}>
        <a href="dashboard.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none', marginBottom: 10 }}>
          <Icon name="arrowR" size={15} stroke={1.8} /> داشبورد
        </a>
        <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: isMobile ? 24 : 28, color: 'var(--ink)', lineHeight: 1.3 }}>گزارش فعالیت‌ها</h1>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>
          {memberId ? 'فعالیت‌های ثبت‌شدهٔ این عضو.' : 'هر تغییری که در صندوق ثبت می‌شود — پرداخت، وام، عضو، سهم، نوبت و تنظیمات — اینجا ثبت می‌گردد.'}
        </p>
      </div>

      {/* toolbar: search + category chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={16} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در فعالیت‌ها…"
            style={{ width: '100%', height: 40, padding: '0 38px 0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface)', font: 'inherit', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHIPS.map((c) => {
            const active = cat === c.key;
            return (
              <button key={c.key} onClick={() => setCat(c.key)} style={{
                height: 34, padding: '0 13px', borderRadius: 99, cursor: 'pointer', font: 'inherit',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                border: `1px solid ${active ? 'var(--accent-line)' : 'var(--hair)'}`,
                background: active ? 'var(--accent-soft)' : 'var(--surface)',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
              }}>{c.label}</button>
            );
          })}
        </div>
      </div>

      {/* content */}
      {loading ? (
        <ActivityLogSkeleton />
      ) : err ? (
        <div style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn-line)', borderRadius: 'var(--radius)', padding: '16px 18px', color: 'var(--warn)', fontSize: 13.5 }}>{err}</div>
      ) : shown.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '44px 20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--ink-3)' }}>
            <Icon name={entries.length ? 'search' : 'history'} size={26} stroke={1.4} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-2)' }}>
              {entries.length ? 'فعالیتی با این فیلتر یافت نشد' : 'هنوز فعالیتی ثبت نشده است'}
            </div>
            {!entries.length && <div style={{ fontSize: 13 }}>از این پس هر تغییری در صندوق اینجا ثبت می‌شود.</div>}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {groups.map((g) => (
              <div key={g.day}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 4px 4px', letterSpacing: '0.02em' }}>{g.day}</div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '2px 16px' }}>
                  {g.items.map((e, i) => (
                    <div key={e.id} style={{ borderBottom: i < g.items.length - 1 ? '1px solid var(--hair-2)' : 'none' }}>
                      <ActivityRow e={e} isMobile={isMobile} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {cursor && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
              <button onClick={() => load(cursor)} disabled={more} style={{ ...ghost, opacity: more ? 0.6 : 1 }}>
                <Icon name="refresh" size={15} stroke={1.8} /> {more ? 'در حال بارگذاری…' : 'بارگذاری بیشتر'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function __mount() { ReactDOM.createRoot(document.getElementById('root')).render(<ActivityLog />); }
if (window.API && window.API.boot) window.API.boot(__mount, { eager: true }); else __mount();
