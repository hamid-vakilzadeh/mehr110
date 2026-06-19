/* ui.jsx — shared formatting + minimal line-icon set. Exports to window. */

// money: thousands separators, no trailing zeros, Persian digits (fa-IR)
const fmt = (n) => Math.round(n).toLocaleString('fa-IR');
const faPct = (n) => Math.round(n).toLocaleString('fa-IR');
// Persian digits without grouping (phones, account numbers, raw ids)
const faDigits = (s) => String(s).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

// Money value — mono, tabular. `unit` shows a muted "Rials" label.
function Money({ value, unit, className = '', style = {} }) {
  return (
    <span className={`mono ${className}`} style={style}>
      {fmt(value)}
      {unit && <span style={{ fontFamily: 'var(--sans)', color: 'var(--ink-3)', fontWeight: 500, marginInlineStart: 5, fontSize: '0.62em' }}>{unit}</span>}
    </span>
  );
}

// minimal, consistent line icons (1.6 stroke). functional UI glyphs only.
const ICON_PATHS = {
  alert:   <><path d="M12 3.2 22 19.5H2L12 3.2Z" /><line x1="12" y1="9.5" x2="12" y2="14" /><circle cx="12" cy="16.7" r="0.6" fill="currentColor" stroke="none" /></>,
  search:  <><circle cx="11" cy="11" r="7" /><line x1="16.2" y1="16.2" x2="21" y2="21" /></>,
  chevron: <polyline points="6 9 12 15 18 9" />,
  arrowR:  <><line x1="4" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>,
  check:   <polyline points="4 12 10 18 20 6" />,
  x:       <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  users:   <><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M21 20c0-2.6-1.6-4.9-4-5.7" /></>,
  user:    <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" /></>,
  userPlus:<><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-6 6-6 1.2 0 2.3.3 3.2.8" /><line x1="18" y1="9" x2="18" y2="15" /><line x1="15" y1="12" x2="21" y2="12" /></>,
  grid:    <><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></>,
  rows:    <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>,
  sortNone:<><polyline points="8 10 12 6 16 10" /><polyline points="8 14 12 18 16 14" /></>,
  sortUp:  <polyline points="7 14 12 8 17 14" />,
  sortDn:  <polyline points="7 10 12 16 17 10" />,
  star:    <path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 16.9 6.8 18.8 8 13.2 3.8 9.4l5.6-.6L12 3.5Z" />,
  banknote:<><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>,
  piggyBank:<><path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z" /><path d="M16 10h.01" /><path d="M2 8v1a2 2 0 0 0 2 2h1" /></>,
  clock:   <><circle cx="12" cy="12" r="8.5" /><polyline points="12 7 12 12 16 14" /></>,
  arrowUpRight: <><line x1="7" y1="17" x2="17" y2="7" /><polyline points="9 7 17 7 17 15" /></>,
  grip:    <><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></>,
  edit:    <><path d="M14 5.5 18.5 10 8 20.5 3.5 21 4 16.5 14 5.5Z" /><line x1="12.5" y1="7" x2="17" y2="11.5" /></>,
  trash:   <><polyline points="4 7 20 7" /><path d="M9 7V4.5h6V7" /><path d="M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-4.5L4 8" /><polyline points="4 4 4 8 8 8" /><path d="M4 13a8 8 0 0 0 14 4.5L20 16" /><polyline points="20 20 20 16 16 16" /></>,
  logout:  <><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><polyline points="9 8 5 12 9 16" /><line x1="5" y1="12" x2="15" y2="12" /></>,
  settings:<><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="16" x2="20" y2="16" /><circle cx="9" cy="8" r="2.4" /><circle cx="15" cy="16" r="2.4" /></>,
  download:<><path d="M12 4v10" /><polyline points="8 11 12 15 16 11" /><path d="M5 19h14" /></>,
};

function Icon({ name, size = 16, stroke = 1.6, className = '', style = {} }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', ...style }}>
      {ICON_PATHS[name]}
    </svg>
  );
}

// status pill
function StatusPill({ status }) {
  const active = status === 'active';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12.5, fontWeight: 500, color: active ? 'var(--ink-2)' : 'var(--ink-3)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 99,
        background: active ? 'var(--accent)' : 'var(--fill-1)',
        opacity: active ? 0.9 : 0.6,
      }} />
      {active ? 'فعال' : 'غیرفعال'}
    </span>
  );
}

// responsive: true on narrow (mobile) viewports
function useIsMobile(bp) {
  const q = `(max-width: ${bp || 760}px)`;
  const [m, setM] = React.useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  React.useEffect(() => {
    const mq = matchMedia(q);
    const h = (e) => setM(e.matches);
    mq.addEventListener('change', h);
    setM(mq.matches);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

// ---- skeleton placeholders (shimmer via the .skel class in tokens.css) ----
function Skel({ width, height = 14, radius, circle = false, className = '', style = {} }) {
  const px = (v) => (typeof v === 'number' ? v + 'px' : v);
  return (
    <span className={`skel${circle ? ' skel-circle' : ''} ${className}`}
      style={{ width: px(width), height: px(height), ...(radius != null ? { borderRadius: px(radius) } : null), ...style }} />
  );
}
function SkelText({ width = '100%', height = 12, lines = 1, gap = 7, lastWidth = '60%', style = {} }) {
  if (lines <= 1) return <Skel width={width} height={height} radius={5} style={style} />;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} height={height} radius={5} width={i === lines - 1 ? lastWidth : width} />
      ))}
    </span>
  );
}
function SkelCircle({ size = 28, style = {} }) {
  return <Skel width={size} height={size} circle style={style} />;
}

// ---- reactive access to window.FUND across the classic (no-bundler) scripts ----
// Returns { fund, ready }; re-renders when api.js dispatches 'fund:updated'.
// `ready` is derived every render (self-heals a missed event); a fundVersion
// ref-compare in the effect closes the mount→effect race.
function useFund() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  const seen = React.useRef((window.API && window.API.fundVersion) || 0);
  React.useEffect(() => {
    const onUpdate = () => force();
    window.addEventListener('fund:updated', onUpdate);
    const v = (window.API && window.API.fundVersion) || 0;
    if (v !== seen.current) { seen.current = v; force(); } // fired before listener attached
    return () => window.removeEventListener('fund:updated', onUpdate);
  }, []);
  const ready = window.API ? (!!window.API.fundReady && !!window.FUND) : !!window.FUND;
  return { fund: window.FUND, ready };
}

// How many installments a member is BEHIND on their loan: expected (whole months
// since the loan was issued, capped at the term) minus installments actually paid.
// 0 when there's no active loan, no issue date, or they're on/ahead of schedule.
function loanBehind(loan) {
  if (!loan || loan.status === 'repaid' || !loan.issuedAt) return 0;
  const now = new Date();
  const iss = new Date(loan.issuedAt);
  const monthsElapsed = (now.getFullYear() - iss.getFullYear()) * 12 + (now.getMonth() - iss.getMonth());
  const term = loan.termMonths != null ? loan.termMonths : (loan.term || 0);
  const expected = Math.max(0, Math.min(term, monthsElapsed));
  const paid = loan.installmentsPaid != null
    ? loan.installmentsPaid
    : Math.round((loan.principal - loan.outstanding) / (loan.monthly || 1));
  return Math.max(0, expected - paid);
}

Object.assign(window, { fmt, faPct, faDigits, Money, Icon, StatusPill, useIsMobile, Skel, SkelText, SkelCircle, useFund, loanBehind });
