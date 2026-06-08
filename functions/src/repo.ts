/* ============================================================
   Repository — all Firestore reads + the enriched "member view".
   Functions own every read/write (Admin SDK); the browser never does.

   A member now stores `savings` (authoritative total) and `shares` (a count)
   directly on the member doc — there is no shares sub-collection.
   ============================================================ */
import { db } from "./admin";
import { COL, FUND_DOC, ConfigDoc, LoanRotationDoc } from "./types";
import { LoanView, MemberDerived, deriveLoan, deriveMember, isBehind } from "./derive";
import { Timestamp } from "firebase-admin/firestore";

const ms = (t: unknown): number | null => (t instanceof Timestamp ? t.toMillis() : null);

const DEFAULT_LOAN_PER_SHARE = 60000;

export interface ReceiptView {
  id: string;
  type: "seed" | "installment";
  no: string;
  amount: number;
  date: number | null;
  shareId: string | null;
  loanId: string | null;
  bankTxnId: string | null;
  note: string | null;
}

export interface MemberView extends MemberDerived {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  family: string;
  dob: number | null;
  phones: string[];
  accounts: string[];
  referredBy: string | null; // memberId or raw name
  referredByName: string | null;
  status: "active" | "inactive";
  missed: number;
  behind: boolean;
  loanReceived: boolean;
  loanPos: number;
  createdAt: number | null;
  loan: LoanView | null;
  seedReceipts: ReceiptView[];
  installmentReceipts: ReceiptView[];
}

export async function getConfig(): Promise<ConfigDoc> {
  const snap = await db.collection(COL.fund).doc(FUND_DOC.config).get();
  if (!snap.exists) throw new Error("fund/config not found — run the seed first.");
  const c = snap.data() as ConfigDoc;
  // default any setting added after the doc was created
  if (typeof c.loanPerShare !== "number") c.loanPerShare = DEFAULT_LOAN_PER_SHARE;
  return c;
}

export async function getRotation(): Promise<LoanRotationDoc> {
  const snap = await db.collection(COL.fund).doc(FUND_DOC.loanRotation).get();
  if (!snap.exists) return { round: 1, order: [] };
  return snap.data() as LoanRotationDoc;
}

/** Load one fully-enriched member (savings + shares + loan + receipts + derived). */
export async function loadMember(
  memberId: string,
  parValue: number,
  loanPerShare: number,
  nameById?: Map<string, string>
): Promise<MemberView | null> {
  const ref = db.collection(COL.members).doc(memberId);
  const [mSnap, loanSnap, paymentsSnap] = await Promise.all([
    ref.get(),
    ref.collection(COL.loan).where("status", "==", "active").limit(1).get(),
    ref.collection(COL.payments).orderBy("date", "desc").get(),
  ]);
  if (!mSnap.exists) return null;
  const m = mSnap.data() as Record<string, unknown>;

  const savings = Number(m.savings) || 0;
  const shares = Math.max(0, Number(m.shares) || 0);

  let loan: LoanView | null = null;
  if (!loanSnap.empty) {
    const d = loanSnap.docs[0];
    const l = d.data();
    loan = deriveLoan({
      id: d.id,
      principal: l.principal,
      termMonths: l.termMonths,
      monthly: l.monthly,
      outstanding: l.outstanding,
      status: l.status,
      issuedAt: ms(l.issuedAt),
      bankTxnId: (l.bankTxnId as string | null) ?? null,
      note: (l.note as string | null) ?? null,
    });
  }

  const receipts: ReceiptView[] = paymentsSnap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      type: p.type,
      no: String(p.no),
      amount: p.amount,
      date: ms(p.date),
      shareId: p.shareId ?? null,
      loanId: p.loanId ?? null,
      bankTxnId: (p.bankTxnId as string | null) ?? null,
      note: (p.note as string | null) ?? null,
    };
  });

  const derived = deriveMember(savings, shares, parValue, loanPerShare);
  const missed = Number(m.missed) || 0;
  const firstName = String(m.firstName ?? "");
  const lastName = String(m.lastName ?? "");
  const referredBy = (m.referredBy as string | null) ?? null;

  return {
    id: memberId,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    family: String(m.family ?? ""),
    dob: ms(m.dob),
    phones: (m.phones as string[]) ?? [],
    accounts: (m.accounts as string[]) ?? [],
    referredBy,
    referredByName: referredBy ? (nameById?.get(referredBy) ?? referredBy) : null,
    status: (m.status as "active" | "inactive") ?? "active",
    missed,
    behind: isBehind(savings, shares, parValue, missed),
    loanReceived: !!m.loanReceived,
    loanPos: Number(m.loanPos) || 0,
    createdAt: ms(m.createdAt),
    loan,
    seedReceipts: receipts.filter((r) => r.type === "seed"),
    installmentReceipts: receipts.filter((r) => r.type === "installment"),
    ...derived,
  };
}

/** Load ALL members fully enriched (used by list + dashboard). */
export async function loadAllMembers(parValue: number, loanPerShare: number): Promise<MemberView[]> {
  const all = await db.collection(COL.members).get();
  const nameById = new Map<string, string>();
  all.docs.forEach((d) => {
    const m = d.data();
    nameById.set(d.id, `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim());
  });
  const members = await Promise.all(all.docs.map((d) => loadMember(d.id, parValue, loanPerShare, nameById)));
  return members.filter((m): m is MemberView => m !== null);
}
