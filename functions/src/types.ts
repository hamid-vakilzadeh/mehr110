/* ============================================================
   Firestore data model — types.
   Money is ALWAYS an integer number of Toman (تومان). No floats.
   `balance` (share) and `outstanding` (loan) are AUTHORITATIVE stored
   values. Everything else marked "derived" is recomputed on read.
   ============================================================ */
import { Timestamp } from "firebase-admin/firestore";

export type Status = "active" | "inactive";
export type LoanStatus = "active" | "repaid";
export type PaymentType = "seed" | "installment";

/** members/{memberId} */
export interface MemberDoc {
  firstName: string;
  lastName: string;
  family: string;
  dob: Timestamp | null;
  phones: string[];
  accounts: string[];
  referredBy: string | null; // memberId of the معرف (referrer)
  status: Status;
  // *** AUTHORITATIVE *** total Toman the member has saved. Changes ONLY via
  // payments.recordSeed (savings += amount). Never recomputed from the fee.
  savings: number;
  // how many shares the member holds — a COUNT. Loan capacity scales with it.
  shares: number;
  behind: boolean; // DERIVED (stored for query): flagged behind on payments
  missed: number; // count of missed membership payments
  loanReceived: boolean; // received a loan in the CURRENT round
  loanPos: number; // position in the loan order (mirror of loanRotation.order index)
  createdAt: Timestamp;
}

/** members/{memberId}/loan/{loanId} (0..1 active) */
export interface LoanDoc {
  principal: number;
  termMonths: number;
  monthly: number; // = round(principal / termMonths) — display convenience
  /** *** AUTHORITATIVE *** principal minus installments paid. */
  outstanding: number;
  status: LoanStatus;
  issuedAt: Timestamp;
  bankTxnId: string | null; // bank transfer reference for the disbursement (optional; fund-wide unique)
  note: string | null; // free-text note (optional)
}

/** members/{memberId}/payments/{paymentId} — ledger of receipts */
export interface PaymentDoc {
  type: PaymentType;
  shareId: string | null;
  loanId: string | null;
  no: string; // human receipt number
  amount: number;
  date: Timestamp;
  bankTxnId: string | null; // bank transfer reference (optional; fund-wide unique)
  note: string | null; // free-text note (optional)
}

/** fund/config — single settings doc, INFORMATIONAL only */
export interface ConfigDoc {
  name: string;
  currency: string;
  membershipFee: number; // expected monthly fee — drives NO balance math
  defaultInstallments: number; // UI default only
  parValue: number; // minimum member savings PER SHARE this period (auto-advances monthly; immutable in UI)
  parMonth: number; // Jalali year*12+(month-1) that parValue is current as-of
  loanPerShare: number; // max loan a single fully-funded share qualifies for
  asOf: Timestamp;
}

/** fund/loanRotation — loan turn order (admin-managed) */
export interface LoanRotationDoc {
  order: string[]; // memberIds — drag to reorder
}

export const COL = {
  members: "members",
  shares: "shares",
  loan: "loan",
  payments: "payments",
  fund: "fund",
  bankTxns: "bankTxns", // top-level uniqueness index: doc id = encoded bankTxnId
  audit: "audit", // append-only activity log — one entry per mutating action
} as const;

export const FUND_DOC = { config: "config", loanRotation: "loanRotation" } as const;

/** audit/{id} — one append-only entry per mutating action (the activity log). */
export interface AuditEntry {
  action: string; // dotted key, e.g. "payment.installment", "loan.delete"
  summary: string; // human-readable Farsi one-liner
  meta: Record<string, unknown>; // memberId/memberName/amount/old/new/receiptNo/loanId…
  recordedBy: string | null; // admin uid (from rec())
  recordedByName: string | null; // admin display name / email (the bot shows under its own name)
  recordedAt: Timestamp; // server timestamp
}
