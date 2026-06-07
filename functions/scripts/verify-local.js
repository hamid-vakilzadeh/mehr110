/* Offline end-to-end invariant check — runs the REAL compiled backend
   (seed → repo → dashboard) against an in-memory Firestore double, so it
   works without the Java-based emulator. Verifies every authoritative-vs-
   derived relationship the backend promises.

   Run:  npm --prefix functions run build && node functions/scripts/verify-local.js
*/
const path = require("path");
const lib = path.join(__dirname, "..", "lib");

// --- make serverTimestamp resolve to a real Timestamp in this harness ---
const ff = require("firebase-admin/firestore");
const T = ff.Timestamp;
ff.FieldValue.serverTimestamp = () => T.now();

// --- tiny in-memory Firestore double (only the surface our code uses) ---
let auto = 0;
const store = new Map(); // docPath -> data object

const childDocs = (colPath) => {
  const out = [];
  for (const [p, data] of store) {
    if (p.startsWith(colPath + "/")) {
      const rest = p.slice(colPath.length + 1);
      if (!rest.includes("/")) out.push({ id: rest, path: p, data });
    }
  }
  return out;
};
const cmp = (a, b) => {
  const av = a && typeof a.toMillis === "function" ? a.toMillis() : a;
  const bv = b && typeof b.toMillis === "function" ? b.toMillis() : b;
  return av < bv ? -1 : av > bv ? 1 : 0;
};

function makeQuery(colPath, filters, sort, lim) {
  return {
    where: (f, op, v) => makeQuery(colPath, filters.concat([[f, op, v]]), sort, lim),
    orderBy: (f, dir) => makeQuery(colPath, filters, [f, dir || "asc"], lim),
    limit: (n) => makeQuery(colPath, filters, sort, n),
    get: async () => {
      let rows = childDocs(colPath);
      for (const [f, op, v] of filters) rows = rows.filter((r) => (op === "==" ? r.data[f] === v : true));
      if (sort) rows.sort((a, b) => (sort[1] === "desc" ? -cmp(a.data[sort[0]], b.data[sort[0]]) : cmp(a.data[sort[0]], b.data[sort[0]])));
      if (lim != null) rows = rows.slice(0, lim);
      return {
        size: rows.length,
        empty: rows.length === 0,
        docs: rows.map((r) => ({ id: r.id, ref: docRef(r.path), data: () => ({ ...r.data }) })),
      };
    },
  };
}
function colRef(colPath) {
  const q = makeQuery(colPath, [], null, null);
  return {
    doc: (id) => docRef(colPath + "/" + (id || "auto_" + ++auto)),
    where: q.where,
    orderBy: q.orderBy,
    limit: q.limit,
    get: q.get,
  };
}
function docRef(p) {
  return {
    id: p.split("/").pop(),
    path: p,
    collection: (name) => colRef(p + "/" + name),
    get: async () => ({ exists: store.has(p), id: p.split("/").pop(), ref: docRef(p), data: () => (store.has(p) ? { ...store.get(p) } : undefined) }),
    set: async (data, opts) => { store.set(p, opts && opts.merge && store.has(p) ? { ...store.get(p), ...data } : { ...data }); },
    update: async (data) => { if (!store.has(p)) throw new Error("update missing " + p); store.set(p, { ...store.get(p), ...data }); },
    delete: async () => { store.delete(p); },
  };
}
function makeBatch() {
  const ops = [];
  return {
    set: (ref, data, opts) => ops.push(() => ref.set(data, opts)),
    update: (ref, data) => ops.push(() => ref.update(data)),
    delete: (ref) => ops.push(() => ref.delete()),
    commit: async () => { for (const op of ops) await op(); },
  };
}
const fakeDb = {
  collection: (name) => colRef(name),
  batch: makeBatch,
  runTransaction: async (fn) => fn({
    get: (ref) => ref.get(),
    set: (ref, data, opts) => ref.set(data, opts),
    update: (ref, data) => ref.update(data),
  }),
};

// inject the fake db into the compiled admin module
const adminMod = require(path.join(lib, "admin.js"));
adminMod.db = fakeDb;

const { writeSeed } = require(path.join(lib, "seed.js"));
const { buildDashboard } = require(path.join(lib, "dashboard.js"));

let failures = 0;
const check = (name, cond, extra) =>
  cond ? console.log("  ✓", name) : (failures++, console.log("  ✗", name, extra != null ? "-> " + JSON.stringify(extra) : ""));

(async () => {
  console.log("Seeding (in-memory)…");
  const stats = await writeSeed();
  console.log("  seeded:", JSON.stringify(stats), "docs:", store.size);

  const f = await buildDashboard();
  const par = f.settings.parValue;
  const byId = Object.fromEntries(f.members.map((m) => [m.id, m]));

  console.log("Invariants:");
  check("members seeded ~50", f.members.length >= 45 && f.members.length <= 55, f.members.length);
  check("totalPool == Σ seedBalance", f.kpis.totalPool === f.members.reduce((t, m) => t + m.seedBalance, 0));
  check("outstanding == Σ loan.outstanding", f.kpis.outstanding === f.members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0));
  check("available == totalPool - outstanding", f.kpis.available === f.kpis.totalPool - f.kpis.outstanding);
  check("available >= 0 (not over-lent)", f.kpis.available >= 0, f.kpis.available);
  check("needsAttention == count(behind)", f.kpis.needsAttention === f.members.filter((m) => m.behind).length);
  check("totalShares == Σ nShares", f.kpis.totalShares === f.members.reduce((t, m) => t + m.nShares, 0));

  let shareBad = 0, eligBad = 0, seedBad = 0;
  for (const m of f.members) {
    if (m.shares.reduce((t, s) => t + s.balance, 0) !== m.seedBalance) seedBad++;
    for (const s of m.shares) {
      if (s.funded !== (s.balance >= par)) shareBad++;
      if (s.fundedPct !== Math.min(100, Math.round((s.balance / par) * 100))) shareBad++;
      if (s.loanEligible !== (s.balance >= par)) shareBad++;
    }
    if (m.loanEligible !== (m.shares.filter((s) => s.balance >= par).length >= 1)) eligBad++;
  }
  check("per-share funded/fundedPct/loanEligible correct", shareBad === 0, { shareBad });
  check("member.seedBalance == Σ share.balance", seedBad === 0, { seedBad });
  check("member.loanEligible == (>=1 funded share)", eligBad === 0, { eligBad });

  const loaners = f.members.filter((m) => m.loan);
  check("there ARE active loans seeded", loaners.length === 5, loaners.length);
  check("ALL loan borrowers are loan-eligible (core invariant)", loaners.every((m) => m.loanEligible), loaners.filter((m) => !m.loanEligible).map((m) => m.name));
  let pctBad = 0;
  for (const m of loaners) {
    if (m.loan.pct !== Math.round(((m.loan.principal - m.loan.outstanding) / m.loan.principal) * 100)) pctBad++;
    if (m.loan.outstanding < 0 || m.loan.outstanding > m.loan.principal) pctBad++;
  }
  check("loan.pct + outstanding bounds correct", pctBad === 0, { pctBad });

  let famBad = 0;
  for (const fam of f.families) {
    const ms = fam.memberIds.map((id) => byId[id]);
    if (ms.reduce((t, m) => t + m.seedBalance, 0) !== fam.balance) famBad++;
    if (ms.reduce((t, m) => t + m.nShares, 0) !== fam.shares) famBad++;
  }
  check("family balance/shares aggregates correct", famBad === 0, { famBad });
  check("families sorted by balance desc", f.families.every((fm, i, a) => i === 0 || a[i - 1].balance >= fm.balance));
  check("derived.topFamilyMax == families[0].balance", f.derived.topFamilyMax === (f.families[0] ? f.families[0].balance : 0));

  const firstUnreceived = f.loanOrderIds.find((id) => !byId[id].loanReceived) || null;
  check("loanNext == first un-received in order", f.loanNextId === firstUnreceived);
  check("loanReceivedCount correct", f.loanReceivedCount === f.loanOrderIds.filter((id) => byId[id].loanReceived).length);
  check("parNext == par + membershipFee", f.settings.parNext === par + f.settings.membershipFee);
  check("purchasing all have an under-funded share", f.purchasingIds.every((id) => byId[id].shares.some((s) => s.balance < par)));

  console.log(failures === 0 ? "\nALL INVARIANTS PASS ✓" : `\n${failures} INVARIANT(S) FAILED ✗`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error("verify crashed:", e); process.exit(2); });
