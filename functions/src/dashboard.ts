/* ============================================================
   aggregates.dashboard — assembles the full dashboard payload.
   Non-redundant: full member views + index arrays of memberIds. The client
   (api.js) resolves the ids and adds Jalali labels. Money is integer Toman;
   dates are epoch-ms. Recomputed from authoritative savings/outstanding.
   ============================================================ */
import { getConfig, getRotation, loadAllMembers, MemberView } from "./repo";
import { pct } from "./money";

export interface PendingView {
  label: string;
  target: number; // shares × par (full funding)
  paid: number; // savings
  remaining: number;
  pct: number;
}

export async function buildDashboard() {
  const config = await getConfig();
  const par = config.parValue;
  const loanPerShare = config.loanPerShare;
  const rotation = await getRotation();

  const members = await loadAllMembers(par, loanPerShare);
  const byId = new Map(members.map((m) => [m.id, m]));

  // members still funding their shares (savings < shares × par)
  const pendingOf = (m: MemberView): PendingView | null => {
    if (m.nShares <= 0 || !m.funding) return null;
    return {
      label: `${m.nShares} سهم`,
      target: m.fullTarget,
      paid: m.savings,
      remaining: Math.max(0, m.fullTarget - m.savings),
      pct: m.fundedPct,
    };
  };
  const purchasingIds = members
    .filter((m) => m.status === "active" && pendingOf(m))
    .sort((a, b) => b.fundedPct - a.fundedPct)
    .map((m) => m.id);
  const purchaseTarget = purchasingIds.reduce((t, id) => t + byId.get(id)!.fullTarget, 0);
  const purchasePaid = purchasingIds.reduce((t, id) => t + byId.get(id)!.savings, 0);

  // ---- fund aggregates ----
  const totalPool = members.reduce((t, m) => t + m.savings, 0);
  const outstanding = members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
  const loanedOut = members.reduce((t, m) => t + (m.loan ? m.loan.principal : 0), 0);
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
      const balance = ms.reduce((t, m) => t + m.savings, 0);
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

  // ---- loan rotation ----
  const orderIds = rotation.order.filter((id) => byId.has(id));
  members.forEach((m) => {
    if (m.status === "active" && !orderIds.includes(m.id)) orderIds.push(m.id);
  });
  const loanNextId = orderIds.find((id) => !byId.get(id)!.loanReceived) ?? null;
  const loanReceivedCount = orderIds.filter((id) => byId.get(id)!.loanReceived).length;
  const queueIds = orderIds.filter((id) => !byId.get(id)!.loanReceived);

  // ---- pool growth (synthesized monotonic curve ending at totalPool) ----
  const curYear = new Date(config.asOf.toMillis()).getUTCFullYear();
  const years: number[] = [];
  for (let y = curYear - 9; y <= curYear; y++) years.push(y);
  const growth = years.map((y, i) => {
    const eased = Math.pow((i + 1) / years.length, 1.35);
    const val = Math.round((totalPool * eased) / 10) * 10;
    return { year: y, pool: i === years.length - 1 ? totalPool : val };
  });

  const memberPayload = members.map((m) => ({
    ...m,
    shares: m.nShares, // expose the count under `shares` for the UI
    pendingShare: pendingOf(m),
  }));

  return {
    meta: { label: config.name, name: config.name, currency: config.currency, asOf: config.asOf.toMillis() },
    settings: {
      membershipFee: config.membershipFee,
      defaultInstallments: config.defaultInstallments,
      parValue: par,
      parNext: par + config.membershipFee,
      loanPerShare,
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
    loanReceivedCount,
    loanTotal: orderIds.length,
    queueIds,
    growth,
    kpis: {
      totalPool,
      available,
      outstanding,
      loanedOut,
      activeLoans,
      memberCount: members.length,
      familiesCount: famNames.length,
      totalShares,
      needsAttention,
      purchasing: purchasingIds.length,
      loanEligible: loanEligibleCount,
      parValue: par,
      loanPerShare,
    },
    derived: { topFamilyMax, top3Pct },
  };
}
