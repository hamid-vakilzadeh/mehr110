/* ============================================================
   seedDatabase — deterministic starter dataset for the new model:
   each member stores `savings` (total) + `shares` (a count). ~50 members,
   12 families, a few "behind" and "funding" members, 5 active loans on
   ELIGIBLE members only, a round-based loanRotation. Money is integer Toman.
   Admin-only in production; open in the Emulator.
   ============================================================ */
import { onCall, HttpsError } from "firebase-functions/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./admin";
import { COL, FUND_DOC } from "./types";
import { requireAdmin } from "./auth";

const PAR = 5780; // minimum member savings per share
const MEMBERSHIP = 60; // monthly fee — informational
const DEFAULT_INST = 20; // default installments
const LOAN_PER_SHARE = 60000; // loan capacity per fully-funded share

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILIES = [
  "حسینی", "کریمی", "احمدی", "رضایی", "نظری", "صادقی",
  "تهرانی", "کاظمی", "موسوی", "اصفهانی", "بهرامی", "یزدانی",
];
const FIRST = [
  "مریم", "رضا", "لیلا", "امیر", "ثریا", "حسن", "نادیا", "کاوه",
  "پروین", "داریوش", "شیرین", "امید", "یاسمین", "فرید", "رویا", "بیژن",
  "مهسا", "نوید", "آذر", "حمید", "گلنار", "کوروش", "نیلوفر", "آرش",
  "دنیا", "سعید", "تارا", "کیان", "بانو", "پژمان", "ستاره", "بهروز",
  "لاله", "مهران", "سحر", "رامین", "آناهیتا", "جمشید", "میترا", "سینا",
  "فروغ", "بابک", "پری", "هومن", "نگین", "خسرو", "سیمین", "داوود",
  "ژاله", "ایرج", "مرجان", "وحید", "سپیده", "خسروخان",
];

interface SeedMember {
  id: string;
  firstName: string;
  lastName: string;
  family: string;
  status: "active" | "inactive";
  dob: FirebaseFirestore.Timestamp;
  phones: string[];
  accounts: string[];
  referredBy: string | null;
  savings: number;
  shares: number;
  missed: number;
  behind: boolean;
  loanReceived: boolean;
  loanPos: number;
  loan: { principal: number; termMonths: number; monthly: number; outstanding: number; status: "active" } | null;
  seedReceipts: { no: string; amount: number; date: FirebaseFirestore.Timestamp }[];
  installmentReceipts: { no: string; amount: number; date: FirebaseFirestore.Timestamp }[];
}

function build() {
  const { Timestamp } = require("firebase-admin/firestore");
  const rnd = mulberry32(20260601);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const rint = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const ts = (y: number, m: number, d = 15) => Timestamp.fromDate(new Date(Date.UTC(y, m - 1, d)));

  const famSizes: Record<string, number> = {};
  let target = 50;
  FAMILIES.forEach((f, i) => {
    const remaining = FAMILIES.length - i;
    famSizes[f] = i === FAMILIES.length - 1 ? Math.max(2, target) : Math.min(6, Math.max(2, Math.round(target / remaining) + rint(-1, 1)));
    target -= famSizes[f];
  });

  const firstPool = [...FIRST];
  const takeName = () => firstPool.splice(Math.floor(rnd() * firstPool.length), 1)[0];

  const members: SeedMember[] = [];
  let mid = 0;
  FAMILIES.forEach((fam) => {
    for (let k = 0; k < famSizes[fam]; k++) {
      mid++;
      const r = rnd();
      const shares = r < 0.7 ? 1 : r < 0.94 ? 2 : 3;
      members.push({
        id: `m${mid}`,
        firstName: takeName(),
        lastName: fam,
        family: fam,
        status: "active",
        dob: ts(rint(1958, 2001), rint(1, 12), rint(1, 28)),
        phones: [],
        accounts: [],
        referredBy: null,
        savings: shares * PAR, // fully funded by default
        shares,
        missed: 0,
        behind: false,
        loanReceived: false,
        loanPos: 0,
        loan: null,
        seedReceipts: [],
        installmentReceipts: [],
      });
    }
  });

  [7, 31, 44].forEach((i) => { if (members[i]) members[i].status = "inactive"; });

  // behind members — savings just under their full target, with missed payments
  [3, 12, 21, 28, 39].forEach((i) => {
    const m = members[i];
    if (m && m.status === "active") {
      m.missed = rint(1, 3);
      m.savings = m.shares * PAR - m.missed * MEMBERSHIP;
      m.behind = true;
    }
  });

  // funding members — still saving toward their shares (below par on share 1)
  [1, 9, 17, 25, 36, 42].forEach((i, n) => {
    const m = members[i];
    if (!m || m.status !== "active" || m.behind) return;
    const frac = [0.75, 0.55, 0.3, 0.9, 0.15, 0.45][n] ?? 0.5;
    m.savings = Math.round(m.shares * PAR * frac);
  });

  // contacts + referrer
  members.forEach((m, idx) => {
    const nPhones = rnd() < 0.32 ? 2 : 1;
    for (let i = 0; i < nPhones; i++) m.phones.push("09" + rint(10, 39) + rint(1000000, 9999999));
    const nAcc = rnd() < 0.22 ? 2 : 1;
    for (let i = 0; i < nAcc; i++) m.accounts.push(`${rint(1000, 9999)}-${rint(1000, 9999)}-${rint(10, 99)}`);
    m.referredBy = idx > 2 && rnd() < 0.7 ? members[rint(0, idx - 1)].id : null;
  });

  // loan rotation — active members, scattered received, round 3
  const active = members.filter((m) => m.status === "active");
  const order = active.slice();
  order.forEach((m, i) => {
    m.loanReceived = rnd() < 0.58;
    m.loanPos = i + 1;
  });

  // 5 loans on fully-funded (eligible) members; principal within their capacity
  const eligible = members.filter((m) => m.status === "active" && m.savings >= m.shares * PAR);
  const loanMembers: SeedMember[] = [];
  while (loanMembers.length < 5 && loanMembers.length < eligible.length) {
    const c = pick(eligible);
    if (!loanMembers.includes(c)) loanMembers.push(c);
  }
  const specs = [
    { principal: 30000, term: 24 },
    { principal: 18000, term: 18 },
    { principal: 45000, term: 36 },
    { principal: 12000, term: 12 },
    { principal: 24000, term: 24 },
  ];
  loanMembers.forEach((m, i) => {
    const cap = m.shares * LOAN_PER_SHARE;
    const principal = Math.min(specs[i].principal, cap);
    const term = specs[i].term;
    const monthly = Math.round(principal / term);
    const paid = rint(2, term - 2);
    m.loan = { principal, termMonths: term, monthly, outstanding: Math.max(0, principal - paid * monthly), status: "active" };
  });

  // receipts
  let receiptNo = 10428;
  members.forEach((m) => {
    const nSeed = rint(4, 9);
    for (let i = 0; i < nSeed; i++) m.seedReceipts.push({ no: String(receiptNo++), amount: MEMBERSHIP, date: ts(2026, 6 - i, rint(1, 27)) });
    if (m.loan) {
      const paid = Math.round((m.loan.principal - m.loan.outstanding) / m.loan.monthly);
      for (let i = 0; i < Math.min(paid, 10); i++) m.installmentReceipts.push({ no: String(receiptNo++), amount: m.loan.monthly, date: ts(2026, 6 - i, rint(1, 27)) });
    }
  });

  return { members, order: order.map((m) => m.id), round: 3, lastReceiptNo: receiptNo };
}

export async function writeSeed(): Promise<{ members: number; loans: number; behind: number }> {
  const { members, order, round, lastReceiptNo } = build();

  await db.collection(COL.fund).doc(FUND_DOC.config).set({
    name: "صندوق مهر۱۱۰",
    currency: "تومان",
    membershipFee: MEMBERSHIP,
    defaultInstallments: DEFAULT_INST,
    parValue: PAR,
    loanPerShare: LOAN_PER_SHARE,
    asOf: FieldValue.serverTimestamp(),
    lastReceiptNo,
  });
  await db.collection(COL.fund).doc(FUND_DOC.loanRotation).set({ round, order });

  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = async (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) => {
    batch.set(ref, data);
    if (++ops >= 400) await flush();
  };

  let loans = 0;
  let behind = 0;
  for (const m of members) {
    if (m.behind) behind++;
    const mRef = db.collection(COL.members).doc(m.id);
    await add(mRef, {
      firstName: m.firstName, lastName: m.lastName, family: m.family, dob: m.dob,
      phones: m.phones, accounts: m.accounts, referredBy: m.referredBy, status: m.status,
      savings: m.savings, shares: m.shares, behind: m.behind, missed: m.missed,
      loanReceived: m.loanReceived, loanPos: m.loanPos, createdAt: m.dob,
    });
    if (m.loan) {
      loans++;
      await add(mRef.collection(COL.loan).doc(), { ...m.loan, issuedAt: m.dob });
    }
    for (const r of m.seedReceipts) await add(mRef.collection(COL.payments).doc(), { type: "seed", shareId: null, loanId: null, ...r });
    for (const r of m.installmentReceipts) await add(mRef.collection(COL.payments).doc(), { type: "installment", shareId: null, loanId: null, ...r });
  }
  await flush();
  return { members: members.length, loans, behind };
}

export const seedDatabase = onCall(async (req) => {
  const inEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!inEmulator) requireAdmin(req);

  const force = !!req.data?.force;
  const existing = await db.collection(COL.members).limit(1).get();
  if (!existing.empty && !force) {
    throw new HttpsError("already-exists", "داده موجود است. برای بازنویسی، seedDatabase را با { force: true } صدا بزنید.");
  }
  const stats = await writeSeed();
  return { ok: true, ...stats };
});
