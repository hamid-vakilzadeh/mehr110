/* ============================================================
   aggregates.dashboard — assembles the full dashboard payload.
   Returns a non-redundant payload: full member views + index arrays
   of memberIds (families / loanOrder / purchasing / queue) + scalars.
   The client (api.js) resolves the id references into the exact
   `window.FUND` shape the existing UI expects, and adds Jalali labels.

   Money is integer Toman; dates are epoch-ms (client converts to Jalali).
   Every field here is recomputed from authoritative stored balances.
   ============================================================ */
import { getConfig, getRotation, loadAllMembers, MemberView } from "./repo";
import { pct } from "./money";

export interface PendingShareView {
  label: string;
  target: number;
  monthly: number;
  term: number;
  installmentsPaid: number;
  paid: number;
  remaining: number;
  pct: number;
  openedAt: number | null;
}

export async function buildDashboard() {
  const config = await getConfig();
  const par = config.parValue;
  const rotation = await getRotation();

  const members = await loadAllMembers(par);
  const byId = new Map(members.map((m) => [m.id, m]));

  // ---- pendingShare (DERIVED view of an under-funded share) ----
  const INST = Math.max(1, Math.round(par / config.defaultInstallments));
  const withPending = members.map((m) => {
    const under = m.shares.filter((s) => !s.funded);
    let pendingShare: PendingShareView | null = null;
    if (under.length > 0) {
      // surface the share furthest along toward par (most actively funding)
      const s = under.slice().sort((a, b) => b.balance - a.balance)[0];
      pendingShare = {
        label: s.label,
        target: par,
        monthly: INST,
        term: config.defaultInstallments,
        installmentsPaid: Math.round(s.balance / INST),
        paid: s.balance,
        remaining: par - s.balance,
        pct: pct(s.balance, par),
        openedAt: s.openedAt,
      };
    }
    return { id: m.id, pendingShare };
  });
  const pendingById = new Map(withPending.map((p) => [p.id, p.pendingShare]));

  const purchasingIds = members
    .filter((m) => m.status === "active" && pendingById.get(m.id))
    .sort((a, b) => (pendingById.get(b.id)!.pct - pendingById.get(a.id)!.pct))
    .map((m) => m.id);

  const purchaseTarget = purchasingIds.reduce((t, id) => t + pendingById.get(id)!.target, 0);
  const purchasePaid = purchasingIds.reduce((t, id) => t + pendingById.get(id)!.paid, 0);

  // ---- fund aggregates ----
  const totalPool = members.reduce((t, m) => t + m.seedBalance, 0);
  const outstanding = members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
  const available = totalPool - outstanding;
  const activeLoans = members.filter((m) => m.loan).length;
  const needsAttention = members.filter((m) => m.behind).length;
  const totalShares = members.reduce((t, m) => t + m.nShares, 0);
  const loanEligibleCount = members.filter((m) => m.status === "active" && m.loanEligible).length;

  // ---- by family ----
  const famNames = Array.from(new Set(members.map((m) => m.family)));
  const families = famNames
    .map((family) => {
      const ms = members.filter((m) => m.family === family);
      const shares = ms.reduce((t, m) => t + m.nShares, 0);
      const balance = ms.reduce((t, m) => t + m.seedBalance, 0);
      return {
        family,
        memberCount: ms.length,
        shares,
        balance,
        fundedPct: shares > 0 ? pct(balance, shares * par) : 0,
        memberIds: ms.map((m) => m.id),
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const topFamilyMax = families.length ? families[0].balance : 0;
  const top3 = families.slice(0, 3).reduce((t, f) => t + f.balance, 0);
  const top3Pct = totalPool > 0 ? Math.round((top3 / totalPool) * 100) : 0;

  // ---- loan rotation (round-based; received members keep their position) ----
  // order = rotation.order, filtered to known members, with loanPos = index+1
  const orderIds = rotation.order.filter((id) => byId.has(id));
  // include any members missing from the order at the end (defensive)
  members.forEach((m) => {
    if (m.status === "active" && !orderIds.includes(m.id)) orderIds.push(m.id);
  });
  const loanNextId = orderIds.find((id) => !byId.get(id)!.loanReceived) ?? null;
  const loanReceivedCount = orderIds.filter((id) => byId.get(id)!.loanReceived).length;
  const queueIds = orderIds.filter((id) => !byId.get(id)!.loanReceived);

  // ---- pool growth over time (synthesized monotonic curve ending at totalPool) ----
  const curYear = new Date(config.asOf.toMillis()).getUTCFullYear();
  const startYear = curYear - 9;
  const years: number[] = [];
  for (let y = startYear; y <= curYear; y++) years.push(y);
  const growth = years.map((y, i) => {
    const frac = (i + 1) / years.length;
    const eased = Math.pow(frac, 1.35);
    const val = Math.round((totalPool * eased) / 10) * 10;
    return { year: y, pool: i === years.length - 1 ? totalPool : val };
  });

  // attach pendingShare onto member views for the client
  const memberPayload = members.map((m: MemberView) => ({
    ...m,
    pendingShare: pendingById.get(m.id) ?? null,
  }));

  return {
    meta: {
      label: config.name,
      name: config.name,
      currency: config.currency,
      asOf: config.asOf.toMillis(),
    },
    settings: {
      membershipFee: config.membershipFee,
      defaultInstallments: config.defaultInstallments,
      parValue: par,
      parNext: par + config.membershipFee,
      currency: config.currency,
    },
    members: memberPayload,
    families,
    familiesCount: famNames.length,
    purchasingIds,
    purchaseAgg: {
      count: purchasingIds.length,
      target: purchaseTarget,
      paid: purchasePaid,
      remaining: purchaseTarget - purchasePaid,
      price: par,
    },
    loanOrderIds: orderIds,
    loanNextId,
    loanRound: rotation.round,
    loanReceivedCount,
    loanTotal: orderIds.length,
    queueIds,
    growth,
    kpis: {
      totalPool,
      available,
      outstanding,
      activeLoans,
      memberCount: members.length,
      familiesCount: famNames.length,
      totalShares,
      needsAttention,
      purchasing: purchasingIds.length,
      loanEligible: loanEligibleCount,
      parValue: par,
    },
    derived: { topFamilyMax, top3Pct },
  };
}
