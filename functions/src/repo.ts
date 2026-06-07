/* ============================================================
   Repository — all Firestore reads + the enriched "member view".
   Functions own every read/write (Admin SDK); the browser never does.
   ============================================================ */
import { db } from "./admin";
import { COL, FUND_DOC, ConfigDoc, LoanRotationDoc } from "./types";
import {
  ShareView,
  LoanView,
  MemberDerived,
  deriveShare,
  deriveLoan,
  deriveMember,
  isBehind,
} from "./derive";
import { Timestamp } from "firebase-admin/firestore";

const ms = (t: unknown): number | null =>
  t instanceof Timestamp ? t.toMillis() : null;

export interface ReceiptView {
  id: string;
  type: "seed" | "installment";
  no: string;
  amount: number;
  date: number | null;
  shareId: string | null;
  loanId: string | null;
}

export interface MemberView extends MemberDerived {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // firstName + " " + lastName (UI convenience)
  family: string;
  dob: number | null;
  phones: string[];
  accounts: string[];
  referredBy: string | null; // memberId
  referredByName: string | null; // resolved name for display
  status: "active" | "inactive";
  missed: number;
  behind: boolean;
  loanReceived: boolean;
  loanPos: number;
  createdAt: number | null;
  shares: ShareView[];
  loan: LoanView | null;
  seedReceipts: ReceiptView[];
  installmentReceipts: ReceiptView[];
}

export async function getConfig(): Promise<ConfigDoc> {
  const snap = await db.collection(COL.fund).doc(FUND_DOC.config).get();
  if (!snap.exists) {
    throw new Error("fund/config not found — run the seed first.");
  }
  return snap.data() as ConfigDoc;
}

export async function getRotation(): Promise<LoanRotationDoc> {
  const snap = await db.collection(COL.fund).doc(FUND_DOC.loanRotation).get();
  if (!snap.exists) return { round: 1, order: [] };
  return snap.data() as LoanRotationDoc;
}

/** Load one fully-enriched member (shares + loan + receipts + derived). */
export async function loadMember(
  memberId: string,
  parValue: number,
  nameById?: Map<string, string>
): Promise<MemberView | null> {
  const ref = db.collection(COL.members).doc(memberId);
  const [mSnap, sharesSnap, loanSnap, paymentsSnap] = await Promise.all([
    ref.get(),
    ref.collection(COL.shares).orderBy("openedAt", "asc").get(),
    ref.collection(COL.loan).where("status", "==", "active").limit(1).get(),
    ref.collection(COL.payments).orderBy("date", "desc").get(),
  ]);
  if (!mSnap.exists) return null;
  const m = mSnap.data() as Record<string, unknown>;

  const shares: ShareView[] = sharesSnap.docs.map((d) => {
    const s = d.data();
    return deriveShare(
      { id: d.id, label: s.label, balance: s.balance, openedAt: ms(s.openedAt) },
      parValue
    );
  });

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
    };
  });

  const derived = deriveMember(shares, parValue);
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
    // referredBy may be a memberId (spec) or a plain typed name (design form);
    // resolve an id to its member name, otherwise show the raw string as-is.
    referredByName: referredBy ? (nameById?.get(referredBy) ?? referredBy) : null,
    status: (m.status as "active" | "inactive") ?? "active",
    missed,
    behind: isBehind(shares, missed),
    loanReceived: !!m.loanReceived,
    loanPos: Number(m.loanPos) || 0,
    createdAt: ms(m.createdAt),
    shares,
    loan,
    seedReceipts: receipts.filter((r) => r.type === "seed"),
    installmentReceipts: receipts.filter((r) => r.type === "installment"),
    ...derived,
  };
}

/** Load ALL members fully enriched (used by list + dashboard). */
export async function loadAllMembers(parValue: number): Promise<MemberView[]> {
  const all = await db.collection(COL.members).get();
  // name map for referrer resolution
  const nameById = new Map<string, string>();
  all.docs.forEach((d) => {
    const m = d.data();
    nameById.set(d.id, `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim());
  });
  const members = await Promise.all(
    all.docs.map((d) => loadMember(d.id, parValue, nameById))
  );
  return members.filter((m): m is MemberView => m !== null);
}
