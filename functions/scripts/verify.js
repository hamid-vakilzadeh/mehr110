/* End-to-end invariant check against the Firestore emulator.
   Run via:  firebase emulators:exec --only firestore --project demo-mehr110 \
               "node functions/scripts/verify.js"
   Seeds the DB, builds the dashboard payload, and asserts every
   authoritative-vs-derived relationship the backend promises. */
const path = require("path");
const lib = path.join(__dirname, "..", "lib");
const { writeSeed } = require(path.join(lib, "seed.js"));
const { buildDashboard } = require(path.join(lib, "dashboard.js"));

let failures = 0;
function check(name, cond, extra) {
  if (cond) { console.log("  ✓", name); }
  else { failures++; console.log("  ✗", name, extra != null ? "->" + JSON.stringify(extra) : ""); }
}

(async () => {
  console.log("Seeding emulator…");
  const stats = await writeSeed();
  console.log("  seeded:", JSON.stringify(stats));

  console.log("Building dashboard…");
  const f = await buildDashboard();
  const par = f.settings.parValue;
  const byId = Object.fromEntries(f.members.map((m) => [m.id, m]));

  console.log("Invariants:");
  // ---- money totals ----
  const sumSeed = f.members.reduce((t, m) => t + m.seedBalance, 0);
  check("totalPool == Σ seedBalance", f.kpis.totalPool === sumSeed, { totalPool: f.kpis.totalPool, sumSeed });
  const sumOut = f.members.reduce((t, m) => t + (m.loan ? m.loan.outstanding : 0), 0);
  check("outstanding == Σ loan.outstanding", f.kpis.outstanding === sumOut, { k: f.kpis.outstanding, sumOut });
  check("available == totalPool - outstanding", f.kpis.available === f.kpis.totalPool - f.kpis.outstanding);
  check("needsAttention == count(behind)", f.kpis.needsAttention === f.members.filter((m) => m.behind).length);
  check("totalShares == Σ nShares", f.kpis.totalShares === f.members.reduce((t, m) => t + m.nShares, 0));

  // ---- per-share derived ----
  let shareBad = 0, eligBad = 0, seedBad = 0;
  for (const m of f.members) {
    const sb = m.shares.reduce((t, s) => t + s.balance, 0);
    if (sb !== m.seedBalance) seedBad++;
    for (const s of m.shares) {
      if (s.funded !== (s.balance >= par)) shareBad++;
      if (s.fundedPct !== Math.min(100, Math.round((s.balance / par) * 100))) shareBad++;
      if (s.loanEligible !== (s.balance >= par)) shareBad++;
    }
    const eligible = m.shares.filter((s) => s.balance >= par).length >= 1;
    if (m.loanEligible !== eligible) eligBad++;
  }
  check("every share.funded/fundedPct/loanEligible correct", shareBad === 0, { shareBad });
  check("member.seedBalance == Σ share.balance", seedBad === 0, { seedBad });
  check("member.loanEligible == (>=1 funded share)", eligBad === 0, { eligBad });

  // ---- THE core invariant: loans only on eligible members ----
  const loaners = f.members.filter((m) => m.loan);
  check("all loan borrowers are loan-eligible", loaners.every((m) => m.loanEligible), loaners.filter((m) => !m.loanEligible).map((m) => m.name));
  check("available >= 0 (not over-lent)", f.kpis.available >= 0, { available: f.kpis.available });

  // ---- loan repaid % ----
  let pctBad = 0;
  for (const m of loaners) {
    const want = Math.round(((m.loan.principal - m.loan.outstanding) / m.loan.principal) * 100);
    if (m.loan.pct !== want) pctBad++;
    if (m.loan.outstanding < 0 || m.loan.outstanding > m.loan.principal) pctBad++;
  }
  check("loan.pct + outstanding bounds correct", pctBad === 0, { pctBad });

  // ---- families ----
  let famBad = 0;
  for (const fam of f.families) {
    const ms = fam.memberIds.map((id) => byId[id]);
    const bal = ms.reduce((t, m) => t + m.seedBalance, 0);
    const shr = ms.reduce((t, m) => t + m.nShares, 0);
    if (bal !== fam.balance) famBad++;
    if (shr !== fam.shares) famBad++;
  }
  check("family balance/shares aggregates correct", famBad === 0, { famBad });
  check("families sorted by balance desc", f.families.every((fm, i, a) => i === 0 || a[i - 1].balance >= fm.balance));

  // ---- loan rotation ----
  const firstUnreceived = f.loanOrderIds.find((id) => !byId[id].loanReceived) || null;
  check("loanNext == first un-received in order", f.loanNextId === firstUnreceived, { loanNextId: f.loanNextId, firstUnreceived });
  check("loanReceivedCount correct", f.loanReceivedCount === f.loanOrderIds.filter((id) => byId[id].loanReceived).length);
  check("loanPos mirrors order index", f.loanOrderIds.every((id, i) => byId[id].loanPos === 0 || byId[id].loanPos === i + 1));

  // ---- settings: parNext = par + fee ----
  check("parNext == par + membershipFee", f.settings.parNext === par + f.settings.membershipFee);

  // ---- purchasing (under-funded shares) ----
  check("purchasing members all have an under-funded share", f.purchasingIds.every((id) => byId[id].shares.some((s) => s.balance < par)));

  console.log(failures === 0 ? "\nALL INVARIANTS PASS ✓" : `\n${failures} INVARIANT(S) FAILED ✗`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error("verify crashed:", e); process.exit(2); });
