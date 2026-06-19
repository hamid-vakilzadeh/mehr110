/* Dev/visual harness for the reports templates — NO Firestore, NO deploy.
   Feeds hand-built sample data to the compiled render() functions, writes the
   HTML to /tmp, and (if a local Chrome is found) renders a real PDF via the
   same htmlToPdf() the function uses. Build first: `npm run build`.
   Usage: node scripts/render-report-sample.js [outDir]   (default /tmp) */
const fs = require("fs");
const path = require("path");

const outDir = process.argv[2] || "/tmp";
const { memberStatement } = require("../lib/reports/templates/member-statement");
const { fundSummary } = require("../lib/reports/templates/fund-summary");
const { htmlToPdf } = require("../lib/reports/render");

const PAR = 5780000;
const LPS = 60000;
const NOW = Date.UTC(2026, 5, 1); // ~ خرداد ۱۴۰۵
const month = (back) => Date.UTC(2026, 5 - back, 20);

// 30 receipts so the 24-cap + "older hidden" footnote both exercise
const seedReceipts = Array.from({ length: 26 }, (_, i) => ({
  id: "s" + i, type: "seed", no: String(10428 + i), amount: 60000,
  date: month(i), bankTxnId: i % 5 === 0 ? "TX" + (900000 + i) : null, note: i === 0 ? "نقدی" : null,
}));
const installmentReceipts = Array.from({ length: 6 }, (_, i) => ({
  id: "i" + i, type: "installment", no: String(20500 + i), amount: 1250000,
  date: month(i), bankTxnId: null, note: null,
}));

const member = {
  id: "m12", firstName: "رضا", lastName: "کریمی", name: "رضا کریمی", family: "کریمی",
  status: "active", behind: false, dob: Date.UTC(1979, 3, 12), createdAt: Date.UTC(2018, 2, 1),
  phones: ["0912 345 6789", "0935 111 2222"], accounts: ["6037-9912-3456"],
  referredBy: "m3", referredByName: "مریم حسینی", referredByName2: null,
  savings: 2 * PAR, nShares: 2, shares: 2, fundedShares: 2, fullTarget: 2 * PAR,
  loanEligible: true, funding: false, fundedPct: 100, maxLoan: 2 * LPS, seedBalance: 2 * PAR,
  loanReceived: false, loanPos: 5,
  loan: { id: "l1", principal: 30000000, termMonths: 24, monthly: 1250000, outstanding: 22500000,
    status: "active", issuedAt: Date.UTC(2025, 5, 10), pct: 25, bankTxnId: "LN-2025-44", note: "وام خرید" },
  seedReceipts, installmentReceipts,
};

const fundMembers = [
  member,
  { id: "m1", name: "مریم حسینی", family: "حسینی", nShares: 1, savings: PAR, fundedPct: 100, status: "active", behind: false, loanReceived: true, loan: null },
  { id: "m2", name: "امیر حسینی", family: "حسینی", nShares: 3, savings: Math.round(2.4 * PAR), fundedPct: 80, status: "active", behind: true, loan: { outstanding: 5000000 } },
  { id: "m4", name: "لیلا کریمی", family: "کریمی", nShares: 1, savings: Math.round(0.4 * PAR), fundedPct: 40, status: "active", behind: false, loanReceived: false, loan: null },
  { id: "m5", name: "حسن رضایی", family: "رضایی", nShares: 2, savings: 2 * PAR, fundedPct: 100, status: "inactive", behind: false, loan: null },
];

const dash = {
  meta: { label: "صندوق مهر۱۱۰", name: "صندوق مهر۱۱۰", currency: "تومان", asOf: NOW },
  settings: { membershipFee: 60000, defaultInstallments: 20, parValue: PAR, parNext: PAR + 60000, loanPerShare: LPS, currency: "تومان" },
  members: fundMembers,
  families: [
    { family: "کریمی", memberCount: 2, shares: 3, balance: member.savings + Math.round(0.4 * PAR), fundedPct: 88, memberIds: ["m12", "m4"] },
    { family: "حسینی", memberCount: 2, shares: 4, balance: PAR + Math.round(2.4 * PAR), fundedPct: 85, memberIds: ["m1", "m2"] },
    { family: "رضایی", memberCount: 1, shares: 2, balance: 2 * PAR, fundedPct: 100, memberIds: ["m5"] },
  ],
  familiesCount: 3,
  queueIds: ["m12", "m4"],
  loanOrderIds: ["m1", "m12", "m4"],
  loanNextId: "m12",
  loanReceivedCount: 1, loanTotal: 3,
  kpis: { totalPool: 0, available: 0, outstanding: 27500000, loanedOut: 30000000, activeLoans: 2, memberCount: 5, familiesCount: 3, totalShares: 9, needsAttention: 1, loanEligible: 3, parValue: PAR, loanPerShare: LPS },
};
dash.kpis.totalPool = dash.members.reduce((t, m) => t + m.savings, 0);
dash.kpis.available = dash.kpis.totalPool - dash.kpis.outstanding;

const ms = memberStatement.render({ member, parValue: PAR, asOfMs: NOW, queuePos: 1 });
const fs2 = fundSummary.render(dash);

function sanity(name, html) {
  const bad = ["undefined", "NaN", "[object Object]"].filter((t) => html.includes(t));
  const hasFont = html.includes("data:font/woff2;base64,");
  const hasFa = /[؀-ۿ]/.test(html);
  console.log(`${name}: ${html.length} bytes | font-inlined:${hasFont} | farsi:${hasFa} | suspicious:${bad.length ? bad.join(",") : "none"}`);
}

fs.writeFileSync(path.join(outDir, "member-statement.html"), ms.html);
fs.writeFileSync(path.join(outDir, "fund-summary.html"), fs2.html);
sanity("member-statement.html", ms.html);
sanity("fund-summary.html", fs2.html);

(async () => {
  if (process.env.SKIP_PDF) { console.log("SKIP_PDF set — HTML only."); return; }
  try {
    const buf = await htmlToPdf(ms.html, { headerTemplate: ms.headerTemplate, footerTemplate: ms.footerTemplate });
    fs.writeFileSync(path.join(outDir, "member-statement.pdf"), buf);
    console.log(`member-statement.pdf: ${buf.length} bytes | %PDF:${buf.slice(0, 4).toString() === "%PDF"}`);
    const buf2 = await htmlToPdf(fs2.html, { headerTemplate: fs2.headerTemplate, footerTemplate: fs2.footerTemplate });
    fs.writeFileSync(path.join(outDir, "fund-summary.pdf"), buf2);
    console.log(`fund-summary.pdf: ${buf2.length} bytes | %PDF:${buf2.slice(0, 4).toString() === "%PDF"}`);
  } catch (e) {
    console.log("PDF render skipped/failed (need local Chrome; set CHROME_PATH):", e.message);
  }
})();
