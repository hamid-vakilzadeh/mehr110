/* ============================================================
   THE FAMILY FUND — deterministic sample data
   ~50 members across 12 families. Fixed contribution: 10 Rials / share / month.
   Seed balance = installments × 10. Stable across reloads (seeded RNG).
   Exposes window.FUND.
   ============================================================ */
(function () {
  // --- seeded RNG (mulberry32) so the dataset is identical every load ---
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

  const CONTRIB = 10;        // (legacy) — superseded by the par model below
  const PAR = 5780;          // current full-funded value of a share (THIS month)
  const MEMBERSHIP = 60;     // monthly membership fee — informational, drives no balances
  const DEFAULT_INST = 20;   // default number of installments for a new share
  const NOW = { y: 2026, m: 6 };

  const FAMILIES = [
    'حسینی', 'کریمی', 'احمدی', 'رضایی', 'نظری', 'صادقی',
    'تهرانی', 'کاظمی', 'موسوی', 'اصفهانی', 'بهرامی', 'یزدانی',
  ];
  const FIRST = [
    'مریم', 'رضا', 'لیلا', 'امیر', 'ثریا', 'حسن', 'نادیا', 'کاوه',
    'پروین', 'داریوش', 'شیرین', 'امید', 'یاسمین', 'فرید', 'رویا', 'بیژن',
    'مهسا', 'نوید', 'آذر', 'حمید', 'گلنار', 'کوروش', 'نیلوفر', 'آرش',
    'دنیا', 'سعید', 'تارا', 'کیان', 'بانو', 'پژمان', 'ستاره', 'بهروز',
    'لاله', 'مهران', 'سحر', 'رامین', 'آناهیتا', 'جمشید', 'میترا', 'سینا',
    'فروغ', 'بابک', 'پری', 'هومن', 'نگین', 'خسرو', 'سیمین', 'داوود',
    'ژاله', 'ایرج', 'مرجان', 'وحید', 'سپیده', 'خسروخان',
  ];

  const monthsBetween = (a, b) =>
    (b.y - a.y) * 12 + (b.m - a.m);
  // Jalali (Persian-calendar) month + year, in Persian digits
  const faMonthYear = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long', year: 'numeric' });
  const fmtSince = (d) => faMonthYear.format(new Date(d.y, d.m - 1, 15));

  // distribute members across families (2–6 each, ~50 total)
  const famSizes = {};
  let target = 50;
  FAMILIES.forEach((f, i) => {
    const remainingFam = FAMILIES.length - i;
    const n = i === FAMILIES.length - 1
      ? Math.max(2, target)
      : Math.min(6, Math.max(2, Math.round(target / remainingFam) + rint(-1, 1)));
    famSizes[f] = n;
    target -= n;
  });

  const firstPool = [...FIRST];
  const takeName = () => firstPool.splice(Math.floor(rnd() * firstPool.length), 1)[0];

  const members = [];
  let mid = 0;
  FAMILIES.forEach((fam) => {
    for (let k = 0; k < famSizes[fam]; k++) {
      mid++;
      const name = `${takeName()} ${fam}`;
      // shares: 70% one, 24% two, 6% three
      const r = rnd();
      const nShares = r < 0.70 ? 1 : r < 0.94 ? 2 : 3;

      const shares = [];
      for (let s = 0; s < nShares; s++) {
        // first share oldest; later shares bought years afterward
        const baseYear = s === 0 ? rint(2017, 2023) : rint(2020, 2025);
        const since = { y: baseYear, m: rint(1, 12) };
        if (since.y === NOW.y && since.m > NOW.m) since.m = NOW.m;
        shares.push({
          label: s === 0 ? 'سهم الف' : s === 1 ? 'سهم ب' : 'سهم ج',
          since, sinceLabel: fmtSince(since),
          // balance is an AUTHORITATIVE stored value — NOT derived from the fee.
          // Funded shares sit at the current par value (PAR). Under-funded shares are set below.
          balance: PAR,
          funding: false,
        });
      }
      shares.sort((a, b) => monthsBetween(a.since, NOW) > monthsBetween(b.since, NOW) ? -1 : 1);

      const since = shares[0].since;

      members.push({
        id: 'm' + mid,
        name, family: fam,
        shares,
        nShares,
        since, sinceLabel: fmtSince(since),
        status: 'active',
        rotationReceived: false, // assigned below
        behind: false, missed: 0,
        loan: null,
      });
    }
  });

  // --- rare inactives (3) ---
  [members[7], members[31], members[44]].forEach((m) => { if (m) m.status = 'inactive'; });

  // --- members behind on contributions (reserved warning) — 5 active members ---
  // Their primary share is UNDER-funded (below par) → not loan-eligible.
  const behindIdx = [3, 12, 21, 28, 39];
  behindIdx.forEach((i) => {
    const m = members[i];
    if (m && m.status === 'active') {
      m.behind = true;
      m.missed = rint(1, 3);
      m.shares[0].balance = PAR - m.missed * MEMBERSHIP;   // authoritative stored value
    }
  });

  // --- LOAN ROTATION (round-based, admin-ordered) ---
  // A fixed ORDER of who gets a loan. Members keep their place and are simply
  // marked "received this round" — never moved to the bottom. Next-up = the first
  // member in the order who hasn't received yet. When everyone has received, the
  // round advances and all become eligible again.
  const activeMembers = members.filter((m) => m.status === 'active');
  const loanOrder = activeMembers.slice()
    .sort((a, b) => (monthsBetween(a.since, NOW) > monthsBetween(b.since, NOW) ? -1 : 1));
  loanOrder.forEach((m, i) => {
    m.loanReceived = rnd() < 0.58;            // scattered — received members stay in place
    m.rotationReceived = m.loanReceived;       // legacy alias
    m.loanPos = i + 1;
  });
  const loanNext = loanOrder.find((m) => !m.loanReceived) || null;
  const loanReceivedCount = loanOrder.filter((m) => m.loanReceived).length;
  const loanRound = 3;
  // legacy queue = those not yet received, in order
  const queue = loanOrder.filter((m) => !m.loanReceived);
  queue.forEach((m, i) => { m.queuePos = i + 1; });

  // --- 5 active loans on 5 distinct active members ---
  // INVARIANT: a loan may only be issued to a loan-eligible member — i.e. one with
  // at least one share funded to par. At this point only the "behind" members have an
  // under-funded share, so we exclude them (and inactives) from loan candidates.
  const loanCandidates = members.filter((m) => m.status === 'active' && !m.behind);
  const loanMembers = [];
  while (loanMembers.length < 5) {
    const c = pick(loanCandidates);
    if (!loanMembers.includes(c)) loanMembers.push(c);
  }
  const loanSpecs = [
    { principal: 6000, term: 24 },
    { principal: 3500, term: 18 },
    { principal: 8000, term: 36 },
    { principal: 2400, term: 12 },
    { principal: 4800, term: 24 },
  ];
  loanMembers.forEach((m, i) => {
    const spec = loanSpecs[i];
    const monthly = Math.round(spec.principal / spec.term);
    const paid = rint(2, spec.term - 2);
    const outstanding = Math.max(0, spec.principal - paid * monthly);
    m.loan = {
      principal: spec.principal,
      term: spec.term,
      installmentsPaid: paid,
      monthly,
      outstanding,
      pct: Math.round(((spec.principal - outstanding) / spec.principal) * 100),
    };
  });

  // --- contact details + referrer + payment receipts (statement / form) ---
  const faFullDate = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', day: 'numeric', month: 'long', year: 'numeric' });
  let receiptNo = 10428;
  members.forEach((m, idx) => {
    // date of birth (Jalali)
    const by = rint(1958, 2001);
    const bd = new Date(by, rint(0, 11), rint(1, 28));
    m.dob = { y: by };
    m.dobLabel = faFullDate.format(bd);
    // 1–2 phone numbers
    const nPhones = rnd() < 0.32 ? 2 : 1;
    m.phones = [];
    for (let i = 0; i < nPhones; i++) m.phones.push('09' + rint(10, 39) + ' ' + rint(100, 999) + ' ' + rint(1000, 9999));
    // 1–2 account numbers
    const nAcc = rnd() < 0.22 ? 2 : 1;
    m.accounts = [];
    for (let i = 0; i < nAcc; i++) m.accounts.push(String(rint(1000, 9999)) + '-' + String(rint(1000, 9999)) + '-' + String(rint(10, 99)));
    // referrer (معرف) — most members were introduced by an existing member
    m.referredBy = (idx > 2 && rnd() < 0.7) ? members[rint(0, idx - 1)].name : null;
    // seed / membership payment receipts (newest first)
    const seed = [];
    const nSeed = rint(4, 9);
    for (let i = 0; i < nSeed; i++) {
      const dt = new Date(2026, 5 - i, rint(1, 27));
      seed.push({ no: String(receiptNo++), date: faFullDate.format(dt), amount: MEMBERSHIP });
    }
    m.seedReceipts = seed;
    // loan installment receipts (only if the member has a loan)
    const inst = [];
    if (m.loan) {
      const shown = Math.min(m.loan.installmentsPaid, 10);
      for (let i = 0; i < shown; i++) {
        const dt = new Date(2026, 5 - i, rint(1, 27));
        inst.push({ no: String(receiptNo++), date: faFullDate.format(dt), amount: m.loan.monthly });
      }
    }
    m.installmentReceipts = inst;
  });

  // --- SHARE FUNDING TRACKER: shares being funded up to par over time ---
  // A new share funds from 0 toward PAR. Until it reaches PAR it is NOT loan-eligible.
  // The installment amount is PAR / DEFAULT_INST; balance is stored authoritatively.
  const INST_AMOUNT = Math.round(PAR / DEFAULT_INST);   // ≈ 289 per installment
  const purchaseIdx = [1, 9, 17, 25, 36, 42];
  purchaseIdx.forEach((i, n) => {
    const m = members[i];
    if (!m || m.status !== 'active') return;
    const paidInst = [15, 11, 6, 18, 3, 9][n] || rint(3, 18);
    const balance = paidInst * INST_AMOUNT;             // stored value of the funding share
    const start = { y: 2025, m: [10, 8, 12, 7, 2, 4][n] || rint(1, 12) };
    // attach a brand-new funding share to the member
    const fShare = {
      label: ['سهم الف', 'سهم ب', 'سهم ج', 'سهم د'][m.nShares] || 'سهم جدید',
      since: start, sinceLabel: fmtSince(start),
      balance, funding: true,
    };
    m.shares.push(fShare);
    m.nShares += 1;
    m.pendingShare = {
      label: fShare.label,
      target: PAR,
      monthly: INST_AMOUNT,
      term: DEFAULT_INST,
      installmentsPaid: paidInst,
      paid: balance,
      remaining: PAR - balance,
      pct: Math.round((balance / PAR) * 100),
      sinceLabel: fShare.sinceLabel,
    };
  });
  const purchasing = members.filter((m) => m.pendingShare)
    .sort((a, b) => b.pendingShare.pct - a.pendingShare.pct);
  const purchaseAgg = {
    count: purchasing.length,
    target: purchasing.reduce((t, m) => t + m.pendingShare.target, 0),
    paid: purchasing.reduce((t, m) => t + m.pendingShare.paid, 0),
  };
  purchaseAgg.remaining = purchaseAgg.target - purchaseAgg.paid;
  purchaseAgg.price = PAR;

  // --- DERIVE per-share + per-member funding facts (after all balance adjustments) ---
  members.forEach((m) => {
    m.shares.forEach((s) => {
      s.funded = s.balance >= PAR;
      s.fundedPct = Math.min(100, Math.round((s.balance / PAR) * 100));
      s.loanEligible = s.funded;
    });
    m.seedBalance = m.shares.reduce((t, s) => t + s.balance, 0);   // authoritative sum
    m.fundedShares = m.shares.filter((s) => s.funded).length;
    m.loanEligible = m.fundedShares > 0;                            // ≥1 fully-funded share
    m.funding = m.shares.some((s) => s.funding);
    // overall funding progress = member balance vs. (nShares × par)
    m.fundedPct = Math.min(100, Math.round((m.seedBalance / (m.nShares * PAR)) * 100));
  });

  // ===== aggregates =====
  const totalShares = members.reduce((t, m) => t + m.nShares, 0);
  const totalPool = members.reduce((t, m) => t + m.seedBalance, 0);
  const outstanding = members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
  const available = totalPool - outstanding;
  const activeLoans = members.filter((m) => m.loan).length;
  const needsAttention = members.filter((m) => m.behind).length;
  const familiesCount = FAMILIES.length;

  // seed balance by family (sorted desc)
  const byFamily = FAMILIES.map((f) => {
    const ms = members.filter((m) => m.family === f);
    return {
      family: f,
      memberCount: ms.length,
      shares: ms.reduce((t, m) => t + m.nShares, 0),
      balance: ms.reduce((t, m) => t + m.seedBalance, 0),
      members: ms,
    };
  }).sort((a, b) => b.balance - a.balance);
  const topFamilyMax = byFamily[0].balance;

  // top-3 families share of pool (for an action title)
  const top3 = byFamily.slice(0, 3).reduce((t, f) => t + f.balance, 0);
  const top3Pct = Math.round((top3 / totalPool) * 100);

  // pool growth over time — synthesize monotonic yearly totals ending at totalPool
  const startYear = 2017;
  const years = [];
  for (let y = startYear; y <= NOW.y; y++) years.push(y);
  const growth = years.map((y, i) => {
    const frac = (i + 1) / years.length;
    // gentle compounding curve toward today's pool
    const eased = Math.pow(frac, 1.35);
    const val = Math.round((totalPool * eased) / 10) * 10;
    return { year: y, pool: i === years.length - 1 ? totalPool : val };
  });

  // loan rotation: next member up
  const nextUp = loanNext;
  const loanEligibleCount = members.filter((m) => m.status === 'active' && m.loanEligible).length;

  window.FUND = {
    meta: {
      label: 'صندوق مهر۱۱۰',
      name: 'صندوق مهر۱۱۰',
      asOf: new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', month: 'long', year: 'numeric' }).format(new Date(2026, 5, 1)),
      currency: 'تومان',
    },
    // Settings are INFORMATIONAL — they drive no balance calculations.
    settings: {
      membershipFee: MEMBERSHIP,     // 60 / month
      defaultInstallments: DEFAULT_INST, // 20
      parValue: PAR,                 // 5780 — current full-funded value
      parNext: PAR + MEMBERSHIP,     // 5840 — next month
      currency: 'تومان',
    },
    members,
    families: byFamily,
    familiesCount,
    queue,
    nextUp,
    loanOrder,
    loanNext,
    loanRound,
    loanReceivedCount,
    loanTotal: loanOrder.length,
    growth,
    purchasing,
    purchaseAgg,
    kpis: {
      totalPool, available, outstanding, activeLoans,
      memberCount: members.length, familiesCount, totalShares, needsAttention,
      purchasing: purchasing.length, loanEligible: loanEligibleCount, parValue: PAR,
    },
    derived: { topFamilyMax, top3Pct },
  };
})();
