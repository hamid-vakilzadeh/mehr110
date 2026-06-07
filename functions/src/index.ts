/* ============================================================
   صندوق مهر۱۱۰ — Backend API (Cloud Functions, 2nd gen, Node 20).

   HARD RULES enforced here:
   • The browser NEVER writes Firestore directly — every mutation is a
     callable below, and Firestore Security Rules deny all client writes.
   • Every callable verifies auth + role on every call.
   • Money is integer Toman; share.balance & loan.outstanding are the only
     authoritative numbers — everything else is derived on read.
   • Changing membershipFee / parValue NEVER recomputes a stored balance.

   Callable names map to the spec's dotted names like so:
     members.list   -> membersList,   payments.recordSeed -> paymentsRecordSeed,
     loanOrder.get  -> loanOrderGet,  aggregates.dashboard -> dashboard, etc.
   ============================================================ */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { COL, FUND_DOC } from "./types";
import { requireAdmin, requireAuth, requireSelfOrAdmin } from "./auth";
import { assertAmount, assertPositiveInt, monthlyOf } from "./money";
import { getConfig, getRotation, loadAllMembers, loadMember } from "./repo";
import { buildDashboard } from "./dashboard";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ---------- small helpers ----------
const str = (v: unknown, label: string, max = 120): string => {
  if (typeof v !== "string" || !v.trim()) {
    throw new HttpsError("invalid-argument", `${label} الزامی است.`);
  }
  if (v.length > max) throw new HttpsError("invalid-argument", `${label} بیش از حد طولانی است.`);
  return v.trim();
};
const optStr = (v: unknown, max = 120): string | null =>
  v == null || v === "" ? null : String(v).slice(0, max);
const strArray = (v: unknown, max = 30): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).slice(0, 120)).filter(Boolean).slice(0, max) : [];
const toTs = (v: unknown): Timestamp =>
  typeof v === "number" && Number.isFinite(v) ? Timestamp.fromMillis(v) : Timestamp.now();
const optTs = (v: unknown): Timestamp | null =>
  v == null ? null : toTs(v);

/** Audit stamp for every write — which admin recorded it, and when.
 *  name comes from the Firebase displayName (token.name) or email. */
const rec = (req: CallableRequest) => ({
  recordedBy: req.auth?.uid ?? null,
  recordedByName: req.auth?.token?.name || req.auth?.token?.email || req.auth?.uid || null,
  recordedAt: FieldValue.serverTimestamp(),
});

/** Allocate the next human receipt number from fund/config.
 *  Firestore transactions require ALL reads before ANY writes, so this READS
 *  the counter now and returns a `commit()` to run during the write phase. */
async function allocReceiptNo(
  tx: FirebaseFirestore.Transaction
): Promise<{ no: string; commit: () => void }> {
  const ref = db.collection(COL.fund).doc(FUND_DOC.config);
  const snap = await tx.get(ref);
  const next = ((snap.data()?.lastReceiptNo as number) || 10000) + 1;
  return { no: String(next), commit: () => tx.update(ref, { lastReceiptNo: next }) };
}

/** Current Jalali year*12+(month-1), in Asia/Tehran (authoritative month boundary). */
function currentJalaliYM(): number {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric", month: "numeric", numberingSystem: "latn", timeZone: "Asia/Tehran",
  }).formatToParts(new Date());
  const jy = Number(parts.find((p) => p.type === "year")!.value);
  const jm = Number(parts.find((p) => p.type === "month")!.value);
  return jy * 12 + (jm - 1);
}

/** Advance parValue by membershipFee for each Jalali month elapsed since parMonth.
 *  Each step uses the CURRENT fee at the time it runs, so a later fee change is
 *  never applied retrospectively. parValue is otherwise immutable. */
async function advanceParIfNeeded(): Promise<void> {
  const ref = db.collection(COL.fund).doc(FUND_DOC.config);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const c = snap.data() as Record<string, unknown>;
    const curYM = currentJalaliYM();
    if (typeof c.parMonth !== "number") { tx.update(ref, { parMonth: curYM }); return; }
    let parMonth = c.parMonth as number;
    let par = Number(c.parValue) || 0;
    const fee = Number(c.membershipFee) || 0;
    let steps = 0;
    while (parMonth < curYM && steps < 36) { par += fee; parMonth += 1; steps += 1; }
    if (steps > 0) tx.update(ref, { parValue: par, parMonth, asOf: FieldValue.serverTimestamp() });
  });
}

/** Recompute & persist a member's `behind` flag from current shares. */
async function refreshBehind(memberId: string): Promise<void> {
  const cfg = await getConfig();
  const m = await loadMember(memberId, cfg.parValue, cfg.loanPerShare);
  if (m) {
    await db.collection(COL.members).doc(memberId).update({ behind: m.behind });
  }
}

// ============================================================
//  AUTH / ADMIN
// ============================================================

/** Grant role=admin to a user by email. Caller must already be admin.
 *  (Bootstrap the FIRST admin with the local script: functions/scripts/setAdmin.js) */
export const setAdminRole = onCall(async (req: CallableRequest) => {
  requireAdmin(req);
  const email = str(req.data?.email, "email");
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { role: "admin" });
  return { ok: true, uid: user.uid };
});

/** Update the signed-in admin's display name (shown in audit trail + UI). */
export const setAdminName = onCall(async (req: CallableRequest) => {
  const uid = requireAdmin(req);
  const name = str(req.data?.name, "نام");
  await getAuth().updateUser(uid, { displayName: name });
  await db.collection("admins").doc(uid).set(
    { name, email: req.auth?.token?.email ?? null, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { ok: true, name };
});

// ============================================================
//  MEMBERS
// ============================================================

export const membersList = onCall(async (req) => {
  requireAdmin(req);
  const cfg = await getConfig();
  const members = await loadAllMembers(cfg.parValue, cfg.loanPerShare);
  return { members, parValue: cfg.parValue };
});

export const membersGet = onCall(async (req) => {
  const id = str(req.data?.id, "id");
  requireSelfOrAdmin(req, id);
  const cfg = await getConfig();
  const member = await loadMember(id, cfg.parValue, cfg.loanPerShare);
  if (!member) throw new HttpsError("not-found", "عضو یافت نشد.");
  return { member };
});

export const membersCreate = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const firstName = str(d.firstName, "نام");
  const lastName = str(d.lastName, "نام خانوادگی");
  const family = optStr(d.family) ?? "";
  const shares = Math.max(0, Math.min(50, Math.floor(Number(d.initialShares) || 0)));
  const savings = Math.max(0, Math.floor(Number(d.savings) || 0)); // usually 0; lets an admin set an opening balance
  const status = d.status === "inactive" ? "inactive" : "active";

  const memberRef = db.collection(COL.members).doc();
  await memberRef.set({
    firstName,
    lastName,
    family,
    dob: optTs(d.dob),
    phones: strArray(d.phones),
    accounts: strArray(d.accounts),
    referredBy: optStr(d.referredBy),
    status,
    savings, // authoritative total saved
    shares, // share COUNT
    behind: false,
    missed: 0,
    loanReceived: false,
    loanPos: 0,
    createdAt: FieldValue.serverTimestamp(),
    ...rec(req),
  });

  // append to loan rotation order (active members participate)
  if (status === "active") {
    const rotRef = db.collection(COL.fund).doc(FUND_DOC.loanRotation);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(rotRef);
      const order: string[] = snap.data()?.order ?? [];
      order.push(memberRef.id);
      tx.set(rotRef, { order, round: snap.data()?.round ?? 1 }, { merge: true });
      tx.update(memberRef, { loanPos: order.length });
    });
  }

  return { ok: true, id: memberRef.id };
});

export const membersUpdate = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const id = str(d.id, "id");
  const ref = db.collection(COL.members).doc(id);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "عضو یافت نشد.");

  const patch: Record<string, unknown> = {};
  if (d.firstName !== undefined) patch.firstName = str(d.firstName, "نام");
  if (d.lastName !== undefined) patch.lastName = str(d.lastName, "نام خانوادگی");
  if (d.family !== undefined) patch.family = optStr(d.family) ?? "";
  if (d.dob !== undefined) patch.dob = optTs(d.dob);
  if (d.phones !== undefined) patch.phones = strArray(d.phones);
  if (d.accounts !== undefined) patch.accounts = strArray(d.accounts);
  if (d.referredBy !== undefined) patch.referredBy = optStr(d.referredBy);
  if (d.status !== undefined) patch.status = d.status === "inactive" ? "inactive" : "active";
  if (d.shares !== undefined) patch.shares = Math.max(0, Math.min(50, Math.floor(Number(d.shares) || 0)));

  if (Object.keys(patch).length === 0) {
    throw new HttpsError("invalid-argument", "هیچ فیلدی برای به‌روزرسانی ارسال نشده است.");
  }
  Object.assign(patch, rec(req));
  await ref.update(patch);
  return { ok: true, id };
});

export const membersDelete = onCall(async (req) => {
  requireAdmin(req);
  const id = str(req.data?.id, "id");
  const ref = db.collection(COL.members).doc(id);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "عضو یافت نشد.");

  // delete subcollections (shares, loan, payments) then the member doc
  for (const sub of [COL.shares, COL.loan, COL.payments]) {
    const docs = await ref.collection(sub).get();
    let batch = db.batch();
    let n = 0;
    for (const doc of docs.docs) {
      batch.delete(doc.ref);
      if (++n % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    await batch.commit();
  }
  await ref.delete();

  // remove from loan rotation order
  const rotRef = db.collection(COL.fund).doc(FUND_DOC.loanRotation);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rotRef);
    if (!snap.exists) return;
    const order: string[] = (snap.data()?.order ?? []).filter((x: string) => x !== id);
    tx.update(rotRef, { order });
  });
  return { ok: true, id };
});

// ============================================================
//  SHARES
// ============================================================

export const sharesAdd = onCall(async (req) => {
  requireAdmin(req);
  const memberId = str(req.data?.memberId, "memberId");
  const ref = db.collection(COL.members).doc(memberId);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "عضو یافت نشد.");
  const add = Math.max(1, Math.floor(Number(req.data?.count) || 1)); // how many shares to add
  const shares = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "عضو یافت نشد.");
    const n = Math.max(0, Number(snap.data()?.shares) || 0) + add;
    tx.update(ref, { shares: n, ...rec(req) });
    return n;
  });
  return { ok: true, shares };
});

export const sharesGet = onCall(async (req) => {
  const memberId = str(req.data?.memberId, "memberId");
  requireSelfOrAdmin(req, memberId);
  const cfg = await getConfig();
  const m = await loadMember(memberId, cfg.parValue, cfg.loanPerShare);
  if (!m) throw new HttpsError("not-found", "عضو یافت نشد.");
  return { shares: m.nShares, savings: m.savings, fundedShares: m.fundedShares, maxLoan: m.maxLoan };
});

// ============================================================
//  PAYMENTS  (the ONLY way balances change)
// ============================================================

export const paymentsRecordSeed = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const memberId = str(d.memberId, "memberId");
  const amount = assertPositiveInt(d.amount, "مبلغ");
  const date = toTs(d.date);

  const memberRef = db.collection(COL.members).doc(memberId);
  const out = await db.runTransaction(async (tx) => {
    // --- READS first ---
    const snap = await tx.get(memberRef);
    const receipt = await allocReceiptNo(tx);
    if (!snap.exists) throw new HttpsError("not-found", "عضو یافت نشد.");
    const savings = (Number(snap.data()?.savings) || 0) + amount; // authoritative total
    // --- WRITES ---
    tx.update(memberRef, { savings });
    receipt.commit();
    const pRef = memberRef.collection(COL.payments).doc();
    tx.set(pRef, { type: "seed", shareId: null, loanId: null, no: receipt.no, amount, date, ...rec(req) });
    return { savings, no: receipt.no };
  });

  await refreshBehind(memberId);
  const cfg = await getConfig();
  return {
    ok: true,
    savings: out.savings,
    receiptNo: out.no,
    eligible: out.savings >= cfg.parValue,
  };
});

export const paymentsRecordInstallment = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const memberId = str(d.memberId, "memberId");
  const loanId = str(d.loanId, "loanId");
  const amount = assertPositiveInt(d.amount, "مبلغ");
  const date = toTs(d.date);

  const loanRef = db.collection(COL.members).doc(memberId).collection(COL.loan).doc(loanId);
  const out = await db.runTransaction(async (tx) => {
    // --- READS first ---
    const snap = await tx.get(loanRef);
    const receipt = await allocReceiptNo(tx);
    if (!snap.exists) throw new HttpsError("not-found", "وام یافت نشد.");
    const outstanding = (snap.data()?.outstanding as number) || 0;
    const newOutstanding = Math.max(0, outstanding - amount); // authoritative
    const status = newOutstanding === 0 ? "repaid" : "active";
    // --- WRITES ---
    tx.update(loanRef, { outstanding: newOutstanding, status });
    receipt.commit();
    const pRef = db.collection(COL.members).doc(memberId).collection(COL.payments).doc();
    tx.set(pRef, { type: "installment", shareId: null, loanId, no: receipt.no, amount, date, ...rec(req) });
    return { newOutstanding, status, no: receipt.no };
  });
  return { ok: true, outstanding: out.newOutstanding, status: out.status, receiptNo: out.no };
});

export const paymentsList = onCall(async (req) => {
  const memberId = str(req.data?.memberId, "memberId");
  requireSelfOrAdmin(req, memberId);
  const cfg = await getConfig();
  const m = await loadMember(memberId, cfg.parValue, cfg.loanPerShare);
  if (!m) throw new HttpsError("not-found", "عضو یافت نشد.");
  return { seed: m.seedReceipts, installments: m.installmentReceipts };
});

// ============================================================
//  LOANS
// ============================================================

export const loansIssue = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const memberId = str(d.memberId, "memberId");
  const principal = assertPositiveInt(d.principal, "اصل وام");
  const termMonths = assertPositiveInt(d.termMonths, "مدت (ماه)");
  const monthly =
    d.monthly !== undefined ? assertPositiveInt(d.monthly, "قسط ماهانه") : monthlyOf(principal, termMonths);
  // installments already paid — lets the admin record a loan that predates the app
  const installmentsPaid = Math.max(0, Math.min(termMonths, Math.floor(Number(d.installmentsPaid) || 0)));
  const existing = !!d.existing; // recording a pre-existing (off-app) loan
  const issuedAt = optTs(d.issuedAt);

  // outstanding is authoritative; derived once here from principal − paid·monthly
  const outstanding = Math.max(0, principal - installmentsPaid * monthly);

  const cfg = await getConfig();
  const member = await loadMember(memberId, cfg.parValue, cfg.loanPerShare);
  if (!member) throw new HttpsError("not-found", "عضو یافت نشد.");
  if (member.loan && member.loan.status === "active") {
    throw new HttpsError("failed-precondition", "این عضو هم‌اکنون یک وام فعال دارد.");
  }

  // For a NEW loan, enforce the fund's rules. When RECORDING a pre-existing
  // loan (`existing`), the money already left the fund historically, so skip
  // the eligibility + available checks — the admin is entering ground truth.
  if (!existing) {
    if (!member.loanEligible) {
      throw new HttpsError(
        "failed-precondition",
        "این عضو واجد شرایط وام نیست — دست‌کم یک سهم باید تا حداقل پس‌انداز تأمین شده باشد."
      );
    }
    // a member can borrow up to fundedShares × loanPerShare
    if (principal > member.maxLoan) {
      throw new HttpsError(
        "failed-precondition",
        `سقف وام این عضو ${member.maxLoan} تومان است (${member.fundedShares} سهم واجد شرایط).`
      );
    }
    const all = await loadAllMembers(cfg.parValue, cfg.loanPerShare);
    const totalPool = all.reduce((t, m) => t + m.seedBalance, 0);
    const lent = all.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
    const available = totalPool - lent;
    // only the still-outstanding amount actually leaves the pool
    if (outstanding > available) {
      throw new HttpsError(
        "failed-precondition",
        `مبلغ وام از موجودی قابل وام‌دهی (${available} تومان) بیشتر است.`
      );
    }
  }

  const status = outstanding === 0 ? "repaid" : "active";
  const loanRef = db.collection(COL.members).doc(memberId).collection(COL.loan).doc();
  await loanRef.set({
    principal,
    termMonths,
    monthly,
    outstanding, // authoritative — decremented by installments
    status,
    issuedAt: issuedAt ?? FieldValue.serverTimestamp(),
    ...rec(req),
  });
  // receiving a loan = received in the current round
  await db.collection(COL.members).doc(memberId).update({ loanReceived: true });
  return { ok: true, loanId: loanRef.id, outstanding, monthly, status };
});

export const loansGet = onCall(async (req) => {
  const memberId = str(req.data?.memberId, "memberId");
  requireSelfOrAdmin(req, memberId);
  const cfg = await getConfig();
  const m = await loadMember(memberId, cfg.parValue, cfg.loanPerShare);
  if (!m) throw new HttpsError("not-found", "عضو یافت نشد.");
  return { loan: m.loan };
});

// ============================================================
//  LOAN ROTATION  (round-based order of who gets a loan)
// ============================================================

export const loanOrderGet = onCall(async (req) => {
  requireAdmin(req);
  const rot = await getRotation();
  const cfg = await getConfig();
  const members = await loadAllMembers(cfg.parValue, cfg.loanPerShare);
  const byId = new Map(members.map((m) => [m.id, m]));
  const receivedMap: Record<string, boolean> = {};
  rot.order.forEach((id) => (receivedMap[id] = !!byId.get(id)?.loanReceived));
  return { round: rot.round, order: rot.order, receivedMap };
});

export const loanOrderReorder = onCall(async (req) => {
  requireAdmin(req);
  const order = req.data?.order;
  if (!Array.isArray(order) || order.some((x) => typeof x !== "string")) {
    throw new HttpsError("invalid-argument", "order باید آرایه‌ای از شناسه‌ها باشد.");
  }
  const rotRef = db.collection(COL.fund).doc(FUND_DOC.loanRotation);
  const batch = db.batch();
  batch.set(rotRef, { order, ...rec(req) }, { merge: true }); // positions only; received unchanged
  (order as string[]).forEach((id, i) => {
    batch.update(db.collection(COL.members).doc(id), { loanPos: i + 1 });
  });
  await batch.commit();
  return { ok: true };
});

export const loanOrderMarkReceived = onCall(async (req) => {
  requireAdmin(req);
  const memberId = str(req.data?.memberId, "memberId");
  const received = !!req.data?.received;
  const ref = db.collection(COL.members).doc(memberId);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "عضو یافت نشد.");
  await ref.update({ loanReceived: received, ...rec(req) }); // keeps position; only flags
  return { ok: true };
});

export const loanOrderStartNewRound = onCall(async (req) => {
  requireAdmin(req);
  const rotRef = db.collection(COL.fund).doc(FUND_DOC.loanRotation);
  const members = await db.collection(COL.members).get();
  const batch = db.batch();
  members.docs.forEach((d) => batch.update(d.ref, { loanReceived: false }));
  const round = (await getRotation()).round + 1;
  batch.set(rotRef, { round, ...rec(req) }, { merge: true });
  await batch.commit();
  return { ok: true, round };
});

// ============================================================
//  SETTINGS  (informational — drive NO balance math)
// ============================================================

export const settingsGet = onCall(async (req) => {
  requireAuth(req);
  const cfg = await getConfig();
  return {
    name: cfg.name,
    currency: cfg.currency,
    membershipFee: cfg.membershipFee,
    defaultInstallments: cfg.defaultInstallments,
    parValue: cfg.parValue,
    parNext: cfg.parValue + cfg.membershipFee,
    loanPerShare: cfg.loanPerShare,
    asOf: cfg.asOf.toMillis(),
  };
});

export const settingsUpdate = onCall(async (req) => {
  requireAdmin(req);
  const d = req.data ?? {};
  const patch: Record<string, number> = {};
  if (d.membershipFee !== undefined) patch.membershipFee = assertAmount(d.membershipFee, "حق عضویت");
  if (d.defaultInstallments !== undefined)
    patch.defaultInstallments = assertPositiveInt(d.defaultInstallments, "اقساط پیش‌فرض");
  // parValue is immutable here — it auto-advances monthly (see advanceParIfNeeded).
  if (d.loanPerShare !== undefined) patch.loanPerShare = assertPositiveInt(d.loanPerShare, "سقف وام هر سهم");
  if (Object.keys(patch).length === 0) {
    throw new HttpsError("invalid-argument", "هیچ تنظیمی برای به‌روزرسانی ارسال نشده است.");
  }
  // INVARIANT 6: changing fee/par NEVER recomputes a stored balance.
  await db.collection(COL.fund).doc(FUND_DOC.config).update({ ...patch, ...rec(req) });
  return { ok: true, ...patch };
});

// ============================================================
//  AGGREGATES
// ============================================================

export const dashboard = onCall(async (req) => {
  requireAdmin(req); // the manager's aggregate view — admin only ("hers alone")
  await advanceParIfNeeded(); // roll parValue forward for any elapsed Jalali months
  return buildDashboard();
});

// seed (admin-only) lives in its own module
export { seedDatabase } from "./seed";
