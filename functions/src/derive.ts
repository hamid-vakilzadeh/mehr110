/* ============================================================
   DERIVED FIELDS — recomputed server-side on every read/aggregate.
   NEVER trust the client for any of these. The only authoritative
   stored numbers are share.balance and loan.outstanding.
   ============================================================ */
import { pct } from "./money";

export interface ShareView {
  id: string;
  label: string;
  openedAt: number | null; // epoch ms (client converts to Jalali)
  balance: number; // authoritative
  // derived:
  funded: boolean;
  fundedPct: number;
  loanEligible: boolean;
}

export interface LoanView {
  id: string;
  principal: number;
  termMonths: number;
  monthly: number;
  outstanding: number; // authoritative
  status: "active" | "repaid";
  issuedAt: number | null;
  // derived:
  pct: number; // repaid %
}

/** Per-share derived fields against the CURRENT parValue. */
export function deriveShare(
  s: { id: string; label: string; balance: number; openedAt?: number | null },
  parValue: number
): ShareView {
  const funded = s.balance >= parValue;
  return {
    id: s.id,
    label: s.label,
    openedAt: s.openedAt ?? null,
    balance: s.balance,
    funded,
    fundedPct: pct(s.balance, parValue),
    loanEligible: funded,
  };
}

/** Loan repaid %. outstanding is authoritative. */
export function deriveLoan(l: {
  id: string;
  principal: number;
  termMonths: number;
  monthly: number;
  outstanding: number;
  status: "active" | "repaid";
  issuedAt?: number | null;
}): LoanView {
  return {
    id: l.id,
    principal: l.principal,
    termMonths: l.termMonths,
    monthly: l.monthly,
    outstanding: l.outstanding,
    status: l.status,
    issuedAt: l.issuedAt ?? null,
    pct: pct(l.principal - l.outstanding, l.principal),
  };
}

export interface MemberDerived {
  seedBalance: number; // sum of share balances (authoritative sum)
  nShares: number;
  fundedShares: number;
  loanEligible: boolean; // >= 1 fully-funded share
  fundedPct: number; // blended: seedBalance / (nShares * par)
  funding: boolean; // has at least one under-funded share
}

/** Per-member derived fields. */
export function deriveMember(shares: ShareView[], parValue: number): MemberDerived {
  const nShares = shares.length;
  const seedBalance = shares.reduce((t, s) => t + s.balance, 0);
  const fundedShares = shares.filter((s) => s.funded).length;
  return {
    seedBalance,
    nShares,
    fundedShares,
    loanEligible: fundedShares >= 1,
    fundedPct: nShares > 0 ? pct(seedBalance, nShares * parValue) : 0,
    funding: shares.some((s) => !s.funded),
  };
}

/** A member is "behind" if any share is under-funded *and* they have missed
 *  payments on record. `missed` is the stored count of missed membership fees. */
export function isBehind(shares: ShareView[], missed: number): boolean {
  return missed > 0 && shares.some((s) => !s.funded);
}
