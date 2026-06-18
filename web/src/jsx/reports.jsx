/* reports.jsx — گزارش‌ها: fund-level report menu (modal) for the dashboard.
   Extensible: add a row to FUND_REPORTS + a backend template to add a report.
   Per-member statements are downloaded from each member's statement page. */

const FUND_REPORTS = [
  {
    type: 'fund-summary',
    label: 'گزارش جامع صندوق',
    desc: 'نمای کلی صندوق، تفکیک خانواده‌ها، فهرست کامل اعضا و نوبت وام',
    icon: 'rows',
    params: {},
  },
];

function ReportsMenu({ onClose }) {
  const [busy, setBusy] = React.useState(null);
  const live = !!(window.API && window.API.reportsEnabled && window.API.reportsEnabled());

  const run = async (r) => {
    if (!live) { alert('گزارش‌ها فقط در حالت متصل به سرور در دسترس است.'); return; }
    setBusy(r.type);
    try {
      await window.API.downloadReport(r.type, r.params || {});
    } catch (e) {
      alert('خطا در ساخت گزارش: ' + (e && e.message ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.01 65 / 0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', padding: '22px 24px', maxWidth: 440, width: '100%', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 20, color: 'var(--ink)' }}>گزارش‌ها</h3>
          <button onClick={onClose} aria-label="بستن" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} stroke={2} />
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>
          گزارش به‌صورت PDF ساخته و در زبانهٔ جدید باز می‌شود. صورت‌حساب هر عضو از صفحهٔ همان عضو قابل دریافت است.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FUND_REPORTS.map((r) => (
            <button key={r.type} onClick={() => run(r)} disabled={!!busy} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'right',
              padding: '13px 15px', borderRadius: 11, border: '1px solid var(--hair)',
              background: busy === r.type ? 'var(--accent-soft)' : 'var(--surface)',
              cursor: busy ? 'default' : 'pointer', font: 'inherit', opacity: busy && busy !== r.type ? 0.6 : 1,
            }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name={busy === r.type ? 'refresh' : r.icon} size={18} stroke={1.8} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.5 }}>{busy === r.type ? 'در حال ساخت…' : r.desc}</span>
              </span>
              <Icon name="download" size={16} stroke={1.8} style={{ color: 'var(--ink-3)', flex: 'none' }} />
            </button>
          ))}
        </div>
        {!live && (
          <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>در حالت نمایشی، گزارش‌ها در دسترس نیستند.</div>
        )}
      </div>
    </div>
  );
}
