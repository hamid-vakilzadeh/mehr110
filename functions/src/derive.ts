/* ============================================================
   DERIVED FIELDS — recomputed server-side on every read/aggregate.
   The only authoritative stored numbers are:
     • member.savings   (total Toman the member has saved)
     • member.shares    (how many shares the member holds — a count)
     • loan.outstanding (remaining principal, decremented by amount paid)
   Everything below is derived from those + the current settings.
   ============================================================ */
import { pct } from "./money";

export interface LoanView {
  id: string;
  principal: number;
  termMonths: number;
  monthly: number;
  outstanding: number; // authoritative
  status: "active" | "repaid";
  issuedAt: number | null;
  pct: number; // repaid %
  bankTxnId: string | null;
  note: string | null;
}

/** Loan repaid %. outstanding is authoritative (decremented by amount, not count). */
export function deriveLoan(l: {
  id: string;
  principal: number;
  termMonths: number;
  monthly: number;
  outstanding: number;
  status: "active" | "repaid";
  issuedAt?: number | null;
  bankTxnId?: string | null;
  note?: string | null;
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
    bankTxnId: l.bankTxnId ?? null,
    note: l.note ?? null,
  };
}

export interface MemberDerived {
  savings: number; // authoritative total saved
  seedBalance: number; // alias of savings (kept for the existing UI)
  nShares: number; // share count
  fullTarget: number; // shares × parValue (savings needed to fully fund all shares)
  fundedShares: number; // shares fully backed by savings: min(shares, floor(savings/par))
  loanEligible: boolean; // has met the minimum for at least one share
  maxLoan: number; // fundedShares × loanPerShare — how much they can borrow
  fundedPct: number; // savings ÷ (shares × par)
  funding: boolean; // still below full funding for their shares
}

/**
 * parValue = the minimum member savings PER SHARE (variable each month).
 * loanPerShare = max loan a single fully-funded share qualifies for.
 * A member must save `parValue` to fund one share; each extra share needs
 * another `parValue`. Loan capacity = funded shares × loanPerShare.
 */
export function deriveMember(
  savings: number,
  shares: number,
  parValue: number,
  loanPerShare: number
): MemberDerived {
  const fullTarget = shares * parValue;
  const fundedShares = parValue > 0 ? Math.min(shares, Math.floor(savings / parValue)) : 0;
  return {
    savings,
    seedBalance: savings,
    nShares: shares,
    fullTarget,
    fundedShares,
    loanEligible: fundedShares >= 1,
    maxLoan: fundedShares * loanPerShare,
    fundedPct: fullTarget > 0 ? pct(savings, fullTarget) : 0,
    funding: savings < fullTarget,
  };
}

/** "Behind" = flagged as having missed payments AND not yet fully funded. */
export function isBehind(savings: number, shares: number, parValue: number, missed: number): boolean {
  return missed > 0 && savings < shares * parValue;
}
