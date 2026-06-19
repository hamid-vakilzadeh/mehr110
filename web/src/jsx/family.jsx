/* family.jsx — نمای خانواده، مشابه نمای فردی اما با تجمیع خانوادگی (جدول، نه کارت). */

function FamilyView({ fund, isMobile }) {
  const [open, setOpen] = React.useState(null);
  const PAR = fund.settings.parValue;
  const fams = fund.families; // already sorted desc by balance

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fams.map((f) => {
          const isOpen = open === f.family;
          const behind = f.members.filter((m) => m.behind).length;
          const fundedPct = Math.min(100, Math.round((f.balance / (f.shares * PAR)) * 100));
          return (
            <div key={f.family} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div onClick={() => setOpen(isOpen ? null : f.family)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', flex: 'none', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14 }}>{f.family[0]}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>خانوادهٔ {f.family}</span>
                  {behind > 0 && <Icon name="alert" size={14} stroke={1.7} style={{ color: 'var(--warn)' }} />}
                  <Icon name="chevron" size={15} style={{ color: 'var(--ink-3)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{fmt(f.memberCount)} عضو · {fmt(f.shares)} سهم</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginBottom: 5 }}>
                      <span>تأمین خانواده</span>
                      <span className="mono" style={{ fontWeight: 600, color: fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)' }}>{faPct(fundedPct)}٪</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${fundedPct}%`, height: '100%', background: fundedPct >= 100 ? 'var(--accent)' : 'var(--fill-1)', borderRadius: 99 }} />
                    </div>
                  </div>
                  <Money value={f.balance} unit="تومان" style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', flex: 'none' }} />
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '4px 16px 10px' }}>
                  {f.members.map((m) => (
                    <a key={m.id} href={`statement.html?m=${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: '1px solid var(--hair-2)', textDecoration: 'none', color: 'inherit' }}>
                      {m.behind ? <Icon name="alert" size={13} stroke={1.7} style={{ color: 'var(--warn)' }} /> : <span style={{ width: 13, flex: 'none' }} />}
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                      {m.loanEligible && <Icon name="piggyBank" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />}
                      <span title={m.loan ? 'وام فعال دارد' : 'بدون وام'} style={{ display: 'inline-flex', flex: 'none', color: m.loan ? 'var(--accent)' : 'var(--ink-3)' }}><Icon name="banknote" size={13} /></span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', width: 70, textAlign: 'left' }}>{fmt(m.seedBalance)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col /><col style={{ width: '92px' }} /><col style={{ width: '92px' }} /><col style={{ width: '150px' }} /><col style={{ width: '130px' }} /><col style={{ width: '40px' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
            {['خانواده', 'اعضا', 'سهم‌ها', 'تأمین خانواده', 'موجودی کل'].map((h, i) => (
              <th key={h} style={{ textAlign: 'right', padding: '0 14px', height: 42, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {fams.map((f) => {
            const isOpen = open === f.family;
            const behind = f.members.filter((m) => m.behind).length;
            const fundedPct = Math.min(100, Math.round((f.balance / (f.shares * PAR)) * 100));
            return (
              <React.Fragment key={f.family}>
                <tr onClick={() => setOpen(isOpen ? null : f.family)} className="mrow" style={{
                  borderBottom: isOpen ? 'none' : '1px solid var(--hair-2)', cursor: 'pointer',
                  background: isOpen ? 'var(--surface-2)' : 'transparent',
                }}>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', flex: 'none', fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 14 }}>{f.family[0]}</span>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>خانوادهٔ {f.family}</span>
                      {behind > 0 && <span title="عضو عقب‌افتاده دارد" style={{ display: 'inline-flex', color: 'var(--warn)' }}><Icon name="alert" size={14} stroke={1.7} /></span>}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }} className="mono"><span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{fmt(f.memberCount)}</span></td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }} className="mono"><span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{fmt(f.shares)}</span></td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', minWidth: 30 }}>
                        <div style={{ width: `${fundedPct}%`, height: '100%', background: fundedPct >= 100 ? 'var(--accent)' : 'var(--fill-1)', borderRadius: 99 }} />
                      </div>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: fundedPct >= 100 ? 'var(--accent)' : 'var(--ink-2)', width: 38, textAlign: 'left', flex: 'none' }}>{faPct(fundedPct)}٪</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}><span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{fmt(f.balance)}</span></td>
                  <td style={{ padding: '13px 0 13px 12px', textAlign: 'left' }}>
                    <Icon name="chevron" size={16} style={{ color: 'var(--ink-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
                  </td>
                </tr>
                {isOpen && (
                  <tr style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
                    <td colSpan={6} style={{ padding: '2px 38px 14px 14px' }}>
                      {f.members.map((m) => (
                        <a key={m.id} href={`statement.html?m=${m.id}`} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--hair-2)',
                          textDecoration: 'none', color: 'inherit',
                        }}>
                          {m.behind
                            ? <Icon name="alert" size={14} stroke={1.7} style={{ color: 'var(--warn)' }} />
                            : <span style={{ width: 14, flex: 'none' }} />}
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                          {m.loanEligible && <span title="واجد شرایط وام" style={{ display: 'inline-flex', color: 'var(--accent)' }}><Icon name="piggyBank" size={14} stroke={1.8} /></span>}
                          <span title={m.loan ? 'وام فعال دارد' : 'بدون وام'} style={{ display: 'inline-flex', color: m.loan ? 'var(--accent)' : 'var(--ink-3)' }}><Icon name="banknote" size={12} /></span>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', width: 44, textAlign: 'left' }}>{faPct(m.fundedPct)}٪</span>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', width: 70, textAlign: 'left' }}>{fmt(m.seedBalance)}</span>
                        </a>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { FamilyView });
