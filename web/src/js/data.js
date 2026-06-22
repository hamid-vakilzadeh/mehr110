/* ============================================================
   صندوق مهر۱۱۰ — deterministic DEMO data (offline / FB_LIVE=false).
   New model: each member has `savings` (total) + `shares` (a count).
   Loan capacity = funded shares × loanPerShare. Stable across reloads.
   Exposes window.FUND (same shape the live api.js assembles).
   ============================================================ */
(function () {
  // In LIVE mode the app reads real data from the backend — never generate the
  // demo dataset (so it can't leak to anyone or be used as a fallback).
  if (window.FB_LIVE) return;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260601);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const rint = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  const PAR = 5780000;         // minimum member savings per share
  const MEMBERSHIP = 60;       // monthly fee (informational)
  const DEFAULT_INST = 20;     // default installments
  const LOAN_PER_SHARE = 60000; // loan capacity per fully-funded share
  const NOW = { y: 2026, m: 6 };

  const FAMILIES = ['حسینی','کریمی','احمدی','رضایی','نظری','صادقی','تهرانی','کاظمی','موسوی','اصفهانی','بهرامی','یزدانی'];
  const FIRST = ['مریم','رضا','لیلا','امیر','ثریا','حسن','نادیا','کاوه','پروین','داریوش','شیرین','امید','یاسمین','فرید','رویا','بیژن','مهسا','نوید','آذر','حمید','گلنار','کوروش','نیلوفر','آرش','دنیا','سعید','تارا','کیان','بانو','پژمان','ستاره','بهروز','لاله','مهران','سحر','رامین','آناهیتا','جمشید','میترا','سینا','فروغ','بابک','پری','هومن','نگین','خسرو','سیمین','داوود','ژاله','ایرج','مرجان','وحید','سپیده','خسروخان'];

  const faMonthYear = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long', year: 'numeric' });
  const faFullDate = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric', month: 'long', year: 'numeric' });
  const monthYear = (y, m) => faMonthYear.format(new Date(y, m - 1, 15));
  const pct = (part, whole) => whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;

  const famSizes = {};
  let target = 50;
  FAMILIES.forEach((f, i) => {
    const rem = FAMILIES.length - i;
    famSizes[f] = i === FAMILIES.length - 1 ? Math.max(2, target) : Math.min(6, Math.max(2, Math.round(target / rem) + rint(-1, 1)));
    target -= famSizes[f];
  });
  const firstPool = [...FIRST];
  const takeName = () => firstPool.splice(Math.floor(rnd() * firstPool.length), 1)[0];

  const members = [];
  let mid = 0;
  FAMILIES.forEach((fam) => {
    for (let k = 0; k < famSizes[fam]; k++) {
      mid++;
      const r = rnd();
      const shares = r < 0.70 ? 1 : r < 0.94 ? 2 : 3;
      const by = rint(1958, 2001);
      members.push({
        id: 'm' + mid,
        firstName: takeName(), family: fam,
        shares, savings: shares * PAR,       // fully funded by default
        status: 'active', behind: false, missed: 0,
        loan: null, loanReceived: false, loanPos: 0,
        dob: { y: by }, dobLabel: faFullDate.format(new Date(by, rint(0, 11), rint(1, 27))),
        phones: [], accounts: [], referredBy: null,
        seedReceipts: [], installmentReceipts: [],
      });
    }
  });
  members.forEach((m) => { m.lastName = m.family; m.name = `${m.firstName} ${m.family}`; });

  [7, 31, 44].forEach((i) => { if (members[i]) members[i].status = 'inactive'; });

  // behind — under their target, with missed payments
  [3, 12, 21, 28, 39].forEach((i) => {
    const m = members[i];
    if (m && m.status === 'active') { m.missed = rint(1, 3); m.savings = m.shares * PAR - m.missed * MEMBERSHIP; m.behind = true; }
  });
  // funding — still saving toward their shares
  [1, 9, 17, 25, 36, 42].forEach((i, n) => {
    const m = members[i];
    if (!m || m.status !== 'active' || m.behind) return;
    m.savings = Math.round(m.shares * PAR * ([0.75, 0.55, 0.30, 0.90, 0.15, 0.45][n] ?? 0.5));
  });

  // contacts + referrer + savings receipts
  let receiptNo = 10428;
  members.forEach((m, idx) => {
    const nP = rnd() < 0.32 ? 2 : 1;
    for (let i = 0; i < nP; i++) m.phones.push('09' + rint(10, 39) + ' ' + rint(100, 999) + ' ' + rint(1000, 9999));
    const nA = rnd() < 0.22 ? 2 : 1;
    for (let i = 0; i < nA; i++) m.accounts.push(`${rint(1000, 9999)}-${rint(1000, 9999)}-${rint(10, 99)}`);
    m.referredBy = (idx > 2 && rnd() < 0.7) ? members[rint(0, idx - 1)].name : null;
    const nSeed = rint(4, 9);
    for (let i = 0; i < nSeed; i++) m.seedReceipts.push({ no: String(receiptNo++), date: faFullDate.format(new Date(2026, 5 - i, rint(1, 27))), amount: MEMBERSHIP });
  });

  // loan rotation order
  const active = members.filter((m) => m.status === 'active');
  active.forEach((m, i) => { m.loanReceived = rnd() < 0.58; m.loanPos = i + 1; });
  const loanOrder = active.slice();
  const loanNext = loanOrder.find((m) => !m.loanReceived) || null;
  const loanReceivedCount = loanOrder.filter((m) => m.loanReceived).length;
  const queue = loanOrder.filter((m) => !m.loanReceived);

  // 5 loans on fully-funded (eligible) members
  const eligible = members.filter((m) => m.status === 'active' && m.savings >= m.shares * PAR);
  const loanMembers = [];
  while (loanMembers.length < 5 && loanMembers.length < eligible.length) { const c = pick(eligible); if (!loanMembers.includes(c)) loanMembers.push(c); }
  [[30000, 24], [18000, 18], [45000, 36], [12000, 12], [24000, 24]].forEach(([p0, term], i) => {
    const m = loanMembers[i]; if (!m) return;
    const principal = Math.min(p0, m.shares * LOAN_PER_SHARE);
    const monthly = Math.round(principal / term);
    const paid = rint(2, term - 2);
    const outstanding = Math.max(0, principal - paid * monthly);
    // issued (paid + 0..4) months ago → some members read as behind on installments
    const issuedAt = Date.UTC(2026, 5 - (paid + rint(0, 4)), 15);
    m.loan = { principal, term, termMonths: term, monthly, outstanding, installmentsPaid: paid, issuedAt, pct: pct(principal - outstanding, principal) };
    const shown = Math.min(paid, 10);
    for (let j = 0; j < shown; j++) m.installmentReceipts.push({ no: String(receiptNo++), date: faFullDate.format(new Date(2026, 5 - j, rint(1, 27))), amount: monthly });
  });

  // ---- derive per member ----
  members.forEach((m) => {
    m.nShares = m.shares;
    m.seedBalance = m.savings;
    m.fullTarget = m.shares * PAR;
    m.fundedShares = Math.min(m.shares, Math.floor(m.savings / PAR));
    m.loanEligible = m.fundedShares >= 1;
    m.maxLoan = m.fundedShares * LOAN_PER_SHARE;
    m.fundedPct = pct(m.savings, m.fullTarget);
    m.funding = m.savings < m.fullTarget;
    m.pendingShare = (m.status === 'active' && m.funding)
      ? { label: `${m.shares} سهم`, target: m.fullTarget, paid: m.savings, remaining: Math.max(0, m.fullTarget - m.savings), pct: m.fundedPct }
      : null;
  });

  // ---- aggregates ----
  const totalShares = members.reduce((t, m) => t + m.nShares, 0);
  const totalPool = members.reduce((t, m) => t + m.savings, 0);
  const outstanding = members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
  const loanedOut = members.reduce((t, m) => t + (m.loan ? m.loan.principal : 0), 0);
  const available = totalPool - outstanding;
  const activeLoans = members.filter((m) => m.loan).length;
  const needsAttention = members.filter((m) => m.behind).length;
  const loanEligibleCount = members.filter((m) => m.status === 'active' && m.loanEligible).length;

  const byFamily = FAMILIES.map((f) => {
    const ms = members.filter((m) => m.family === f);
    const shares = ms.reduce((t, m) => t + m.nShares, 0);
    const balance = ms.reduce((t, m) => t + m.savings, 0);
    return { family: f, memberCount: ms.length, shares, balance, fundedPct: pct(balance, shares * PAR), members: ms };
  }).sort((a, b) => b.balance - a.balance);
  const topFamilyMax = byFamily[0].balance;
  const top3 = byFamily.slice(0, 3).reduce((t, f) => t + f.balance, 0);
  const top3Pct = totalPool > 0 ? Math.round((top3 / totalPool) * 100) : 0;

  const years = [];
  for (let y = 2017; y <= NOW.y; y++) years.push(y);
  const growth = years.map((y, i) => {
    const eased = Math.pow((i + 1) / years.length, 1.35);
    return { year: y, pool: i === years.length - 1 ? totalPool : Math.round((totalPool * eased) / 10) * 10 };
  });

  const purchasing = members.filter((m) => m.pendingShare).sort((a, b) => b.fundedPct - a.fundedPct);
  const purchaseAgg = {
    count: purchasing.length,
    target: purchasing.reduce((t, m) => t + m.pendingShare.target, 0),
    paid: purchasing.reduce((t, m) => t + m.pendingShare.paid, 0),
    price: PAR,
  };
  purchaseAgg.remaining = purchaseAgg.target - purchaseAgg.paid;

  window.FUND = {
    meta: { label: 'صندوق مهر۱۱۰', name: 'صندوق مهر۱۱۰', asOf: monthYear(2026, 6), currency: 'تومان' },
    settings: { membershipFee: MEMBERSHIP, defaultInstallments: DEFAULT_INST, parValue: PAR, parNext: PAR + MEMBERSHIP, loanPerShare: LOAN_PER_SHARE, currency: 'تومان' },
    members,
    families: byFamily,
    familiesCount: FAMILIES.length,
    queue, nextUp: loanNext, loanOrder, loanNext, loanReceivedCount, loanTotal: loanOrder.length,
    growth, purchasing, purchaseAgg,
    kpis: {
      totalPool, available, outstanding, loanedOut, activeLoans,
      memberCount: members.length, familiesCount: FAMILIES.length, totalShares, needsAttention,
      purchasing: purchasing.length, loanEligible: loanEligibleCount, parValue: PAR, loanPerShare: LOAN_PER_SHARE,
    },
    derived: { topFamilyMax, top3Pct },
  };
})();

/* ---- demo activity feed (newest-first) for activity.html in DEMO mode ---- */
(function () {
  if (window.FB_LIVE || !window.FUND || !window.FUND.members) { window.DEMO_ACTIVITY = []; return; }
  var ms = window.FUND.members;
  var admin = 'حمیدرضا', bot = 'ربات تلگرام';
  var faN = function (n) { return Number(n || 0).toLocaleString('fa-IR'); };
  var HR = 3600000, E = [], t = Date.now() - HR;
  var nm = function (i) { return ms[i % ms.length].name; };
  var id = function (i) { return ms[i % ms.length].id; };
  var add = function (gapH, by, action, summary, meta) {
    t -= Math.round(gapH * HR);
    E.push({ id: 'demo' + E.length, action: action, summary: summary, meta: meta || {}, recordedByName: by, recordedAt: t });
  };
  add(2, bot, 'payment.seed', nm(0) + ' — پس‌انداز ' + faN(500000) + ' ثبت شد (رسید ۱۰۴۲۹)', { memberId: id(0), memberName: nm(0), amount: 500000, receiptNo: '10429' });
  add(5, admin, 'payment.installment', nm(1) + ' — قسط وام ' + faN(2000000) + ' ثبت شد (مانده ' + faN(8000000) + ')', { memberId: id(1), amount: 2000000 });
  add(20, admin, 'loan.issue', nm(2) + ' — وام ' + faN(50000000) + ' (۲۴ ماه، قسط ' + faN(2083333) + ') صادر شد', { memberId: id(2), amount: 50000000 });
  add(3, bot, 'payment.seed', nm(3) + ' — پس‌انداز ' + faN(500000) + ' ثبت شد (رسید ۱۰۴۲۸)', { memberId: id(3), amount: 500000 });
  add(26, admin, 'payment.update', nm(1) + ' — مبلغ تراکنش ' + faN(1800000) + '←' + faN(2000000) + ' اصلاح شد (رسید ۱۰۴۲۰)', { memberId: id(1) });
  add(10, admin, 'member.create', nm(4) + ' — عضو جدید (۲ سهم)', { memberName: nm(4), shares: 2 });
  add(30, admin, 'payment.delete', nm(5) + ' — پس‌انداز ' + faN(500000) + ' حذف شد (رسید ۱۰۴۱۱)', { memberId: id(5), amount: 500000 });
  add(8, admin, 'share.add', nm(6) + ' — ۱ سهم اضافه شد (کل: ۳)', { memberId: id(6) });
  add(28, bot, 'payment.installment', nm(7) + ' — قسط وام ' + faN(1500000) + ' ثبت شد (مانده ' + faN(6000000) + ')', { memberId: id(7), amount: 1500000 });
  add(34, admin, 'loanorder.received', nm(2) + ' — وام در این دوره دریافت کرد', { memberId: id(2) });
  add(12, admin, 'settings.update', 'تنظیمات به‌روزرسانی شد — سقف وام هر سهم: ' + faN(60000000) + '←' + faN(80000000), {});
  add(40, admin, 'member.update', nm(8) + ' — اطلاعات عضو ویرایش شد (سهم ۲←۳)', { memberId: id(8) });
  add(16, admin, 'payment.seed', nm(9) + ' — پس‌انداز ' + faN(500000) + ' ثبت شد (رسید ۱۰۴۰۵)', { memberId: id(9), amount: 500000 });
  add(44, admin, 'loan.delete', nm(10) + ' — وام ' + faN(12000000) + ' حذف شد (۳ قسط)', { memberId: id(10), amount: 12000000 });
  add(20, bot, 'payment.seed', nm(11) + ' — پس‌انداز ' + faN(500000) + ' ثبت شد (رسید ۱۰۴۰۱)', { memberId: id(11), amount: 500000 });
  add(50, admin, 'loanorder.reorder', 'ترتیب نوبت وام به‌روزرسانی شد (۳۰ عضو)', { count: 30 });
  add(18, admin, 'payment.installment', nm(0) + ' — قسط وام ' + faN(2000000) + ' ثبت شد (مانده ' + faN(4000000) + ')', { memberId: id(0), amount: 2000000 });
  add(60, admin, 'loanorder.newround', 'دور جدید وام‌دهی آغاز شد — وضعیت «دریافت کرده» ۲۹ عضو صفر شد', { count: 29 });
  add(22, admin, 'member.delete', 'حسن صادقی — عضو حذف شد', { memberName: 'حسن صادقی' });
  add(30, bot, 'payment.seed', nm(5) + ' — پس‌انداز ' + faN(700000) + ' ثبت شد (رسید ۱۰۳۹۰)', { memberId: id(5), amount: 700000 });
  window.DEMO_ACTIVITY = E; // already newest-first (t decreases)
})();
