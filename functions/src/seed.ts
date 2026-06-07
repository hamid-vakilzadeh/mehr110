/* ============================================================
   seedDatabase — import a deterministic starter dataset:
   ~50 members across 12 families, a few under-funded "behind" members,
   some shares still funding, 5 active loans on ELIGIBLE members ONLY,
   and a round-based loanRotation.

   Enforces the core invariant at seed time: a loan is only attached to a
   member with at least one share funded to par.

   Money is integer Toman; dates are Timestamps. Deterministic (seeded RNG).
   Admin-only in production; open in the Emulator for convenience.
   ============================================================ */
import { onCall, HttpsError } from "firebase-functions/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { COL, FUND_DOC } from "./types";
import { requireAdmin } from "./auth";

const PAR = 5780; // current full-funded value of a share
const MEMBERSHIP = 60; // monthly fee — informational
const DEFAULT_INST = 20; // default installments for a share
const INST_AMOUNT = Math.round(PAR / DEFAULT_INST); // ≈ 289

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
  id: string; // doc id we pre-allocate
  firstName: string;
  lastName: string;
  family: string;
  status: "active" | "inactive";
  dob: Timestamp;
  phones: string[];
  accounts: string[];
  referredBy: string | null;
  missed: number;
  behind: boolean;
  loanReceived: boolean;
  loanPos: number;
  shares: { label: string; openedAt: Timestamp; balance: number }[];
  loan: { principal: number; termMonths: number; monthly: number; outstanding: number; status: "active" } | null;
  seedReceipts: { no: string; amount: number; date: Timestamp }[];
  installmentReceipts: { no: string; amount: number; date: Timestamp }[];
}

function build(): { members: SeedMember[]; order: string[]; round: number; lastReceiptNo: number } {
  const rnd = mulberry32(20260601);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const rint = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const ts = (y: number, m: number, d = 15) => Timestamp.fromDate(new Date(Date.UTC(y, m - 1, d)));
  const NOW = { y: 2026, m: 6 };
  const monthsBetween = (a: { y: number; m: number }, b: { y: number; m: number }) =>
    (b.y - a.y) * 12 + (b.m - a.m);

  // distribute members across families (2–6 each, ~50 total)
  const famSizes: Record<string, number> = {};
  let target = 50;
  FAMILIES.forEach((f, i) => {
    const remaining = FAMILIES.length - i;
    const n =
      i === FAMILIES.length - 1
        ? Math.max(2, target)
        : Math.min(6, Math.max(2, Math.round(target / remaining) + rint(-1, 1)));
    famSizes[f] = n;
    target -= n;
  });

  const firstPool = [...FIRST];
  const takeName = () => firstPool.splice(Math.floor(rnd() * firstPool.length), 1)[0];

  const members: SeedMember[] = [];
  let mid = 0;
  FAMILIES.forEach((fam) => {
    for (let k = 0; k < famSizes[fam]; k++) {
      mid++;
      const r = rnd();
      const nShares = r < 0.7 ? 1 : r < 0.94 ? 2 : 3;
      const shares: SeedMember["shares"] = [];
      for (let s = 0; s < nShares; s++) {
        const baseYear = s === 0 ? rint(2017, 2023) : rint(2020, 2025);
        let sm = rint(1, 12);
        if (baseYear === NOW.y && sm > NOW.m) sm = NOW.m;
        shares.push({
          label: s === 0 ? "سهم الف" : s === 1 ? "سهم ب" : "سهم ج",
          openedAt: ts(baseYear, sm),
          balance: PAR, // funded by default; under-funded cases set below
        });
      }
      shares.sort((a, b) => a.openedAt.toMillis() - b.openedAt.toMillis());
      const by = rint(1958, 2001);
      members.push({
        id: `m${mid}`,
        firstName: takeName(),
        lastName: fam,
        family: fam,
        status: "active",
        dob: ts(by, rint(1, 12), rint(1, 28)),
        phones: [],
        accounts: [],
        referredBy: null,
        missed: 0,
        behind: false,
        loanReceived: false,
        loanPos: 0,
        shares,
        loan: null,
        seedReceipts: [],
        installmentReceipts: [],
      });
    }
  });

  // rare inactives
  [7, 31, 44].forEach((i) => { if (members[i]) members[i].status = "inactive"; });

  // behind members — primary share UNDER-funded (not loan-eligible)
  [3, 12, 21, 28, 39].forEach((i) => {
    const m = members[i];
    if (m && m.status === "active") {
      m.behind = true;
      m.missed = rint(1, 3);
      m.shares[0].balance = PAR - m.missed * MEMBERSHIP;
    }
  });

  // members funding a brand-new share (under-funded) — purchasing tracker
  const purchaseIdx = [1, 9, 17, 25, 36, 42];
  purchaseIdx.forEach((i, n) => {
    const m = members[i];
    if (!m || m.status !== "active") return;
    const paidInst = [15, 11, 6, 18, 3, 9][n] ?? rint(3, 18);
    const startY = 2025;
    const startM = [10, 8, 12, 7, 2, 4][n] ?? rint(1, 12);
    m.shares.push({
      label: ["سهم الف", "سهم ب", "سهم ج", "سهم د"][m.shares.length] || "سهم جدید",
      openedAt: ts(startY, startM),
      balance: paidInst * INST_AMOUNT,
    });
  });

  // contacts + referrer
  members.forEach((m, idx) => {
    const nPhones = rnd() < 0.32 ? 2 : 1;
    for (let i = 0; i < nPhones; i++) {
      m.phones.push("09" + rint(10, 39) + rint(1000000, 9999999));
    }
    const nAcc = rnd() < 0.22 ? 2 : 1;
    for (let i = 0; i < nAcc; i++) {
      m.accounts.push(`${rint(1000, 9999)}-${rint(1000, 9999)}-${rint(10, 99)}`);
    }
    m.referredBy = idx > 2 && rnd() < 0.7 ? members[rint(0, idx - 1)].id : null;
  });

  // loan rotation order: active members, oldest-first; scattered received; round 3
  const active = members.filter((m) => m.status === "active");
  const order = active.slice().sort((a, b) => {
    const am = monthsBetween(
      { y: new Date(a.shares[0].openedAt.toMillis()).getUTCFullYear(), m: new Date(a.shares[0].openedAt.toMillis()).getUTCMonth() + 1 },
      NOW
    );
    const bm = monthsBetween(
      { y: new Date(b.shares[0].openedAt.toMillis()).getUTCFullYear(), m: new Date(b.shares[0].openedAt.toMillis()).getUTCMonth() + 1 },
      NOW
    );
    return bm - am;
  });
  order.forEach((m, i) => {
    m.loanReceived = rnd() < 0.58;
    m.loanPos = i + 1;
  });

  // 5 active loans — ONLY on eligible (active, not-behind => has a funded share) members
  const candidates = members.filter((m) => m.status === "active" && !m.behind);
  const loanMembers: SeedMember[] = [];
  while (loanMembers.length < 5 && loanMembers.length < candidates.length) {
    const c = pick(candidates);
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
    m.loan = { principal: spec.principal, termMonths: spec.term, monthly, outstanding, status: "active" };
  });

  // receipts (newest first)
  let receiptNo = 10428;
  members.forEach((m) => {
    const nSeed = rint(4, 9);
    for (let i = 0; i < nSeed; i++) {
      m.seedReceipts.push({ no: String(receiptNo++), amount: MEMBERSHIP, date: ts(2026, 6 - i, rint(1, 27)) });
    }
    if (m.loan) {
      const paid = Math.round((m.loan.principal - m.loan.outstanding) / m.loan.monthly);
      const shown = Math.min(paid, 10);
      for (let i = 0; i < shown; i++) {
        m.installmentReceipts.push({ no: String(receiptNo++), amount: m.loan.monthly, date: ts(2026, 6 - i, rint(1, 27)) });
      }
    }
  });

  return { members, order: order.map((m) => m.id), round: 3, lastReceiptNo: receiptNo };
}

export async function writeSeed(): Promise<{ members: number; loans: number; behind: number }> {
  const { members, order, round, lastReceiptNo } = build();

  // config + rotation
  await db.collection(COL.fund).doc(FUND_DOC.config).set({
    name: "صندوق مهر۱۱۰",
    currency: "تومان",
    membershipFee: MEMBERSHIP,
    defaultInstallments: DEFAULT_INST,
    parValue: PAR,
    asOf: FieldValue.serverTimestamp(),
    lastReceiptNo,
  });
  await db.collection(COL.fund).doc(FUND_DOC.loanRotation).set({ round, order });

  // members + subcollections, committed in chunks
  let batch = db.batch();
  let ops = 0;
  const flush = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) => {
    batch.set(ref, data);
    if (++ops >= 400) return flush();
    return Promise.resolve();
  };

  let loans = 0;
  let behind = 0;
  for (const m of members) {
    if (m.behind) behind++;
    const mRef = db.collection(COL.members).doc(m.id);
    await add(mRef, {
      firstName: m.firstName,
      lastName: m.lastName,
      family: m.family,
      dob: m.dob,
      phones: m.phones,
      accounts: m.accounts,
      referredBy: m.referredBy,
      status: m.status,
      behind: m.behind,
      missed: m.missed,
      loanReceived: m.loanReceived,
      loanPos: m.loanPos,
      createdAt: m.shares[0]?.openedAt ?? FieldValue.serverTimestamp(),
    });
    for (const s of m.shares) {
      await add(mRef.collection(COL.shares).doc(), s);
    }
    if (m.loan) {
      loans++;
      await add(mRef.collection(COL.loan).doc(), { ...m.loan, issuedAt: m.shares[0]?.openedAt ?? FieldValue.serverTimestamp() });
    }
    for (const r of m.seedReceipts) {
      await add(mRef.collection(COL.payments).doc(), { type: "seed", shareId: null, loanId: null, ...r });
    }
    for (const r of m.installmentReceipts) {
      await add(mRef.collection(COL.payments).doc(), { type: "installment", shareId: null, loanId: null, ...r });
    }
  }
  await flush();
  return { members: members.length, loans, behind };
}

export const seedDatabase = onCall(async (req) => {
  const inEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!inEmulator) requireAdmin(req); // production: admin only

  const force = !!req.data?.force;
  const existing = await db.collection(COL.members).limit(1).get();
  if (!existing.empty && !force) {
    throw new HttpsError(
      "already-exists",
      "داده موجود است. برای بازنویسی، seedDatabase را با { force: true } صدا بزنید."
    );
  }
  const stats = await writeSeed();
  return { ok: true, ...stats };
});
