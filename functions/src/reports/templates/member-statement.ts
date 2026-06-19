/* ============================================================
   reports/templates/member-statement.ts — صورت‌حساب عضو (paper).
   All of the member's information + their 24 most-recent transactions
   (savings + loan installments combined). Admin-only.
   ============================================================ */
import { buildDashboard } from "../../dashboard";
import type { ReportDef, ReportResult } from "../types";
import { ReportError } from "../types";
import { pageDocument, printHeaderTemplate, printFooterTemplate, TOKENS } from "../theme";
import { esc, faDigits, money, moneyT, pctFa, jFullDate, jShortDate, jMonthYear } from "../format";

type Dash = Awaited<ReturnType<typeof buildDashboard>>;
type DashMember = Dash["members"][number];
type Receipt = DashMember["seedReceipts"][number];

// Loan-severity color — mirrors web/src/jsx/ui.jsx loanRemColor so the loan bar
// reads identically on screen and in the (Chromium-rendered) PDF. Maps a loan's
// remaining-balance % to a green→amber→terracotta oklch color: small remaining =
// calm, large remaining = alarming.
function loanRemColor(remPct: number): string {
  const p = Math.max(0, Math.min(100, remPct)) / 100;
  const stops: [number, number, number][] = [[0.52, 0.10, 158], [0.62, 0.13, 70], [0.55, 0.155, 35]];
  const a = p <= 0.5 ? stops[0] : stops[1];
  const b = p <= 0.5 ? stops[1] : stops[2];
  const t = p <= 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
  const L = a[0] + (b[0] - a[0]) * t;
  const C = a[1] + (b[1] - a[1]) * t;
  const H = a[2] + (b[2] - a[2]) * t;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

export interface MemberStatementData {
  member: DashMember;
  parValue: number;
  asOfMs: number;
  queuePos: number; // 1-based position in the loan queue; 0 if not queued
}

const REPORT_TITLE = "صورت‌حساب عضو";
const TX_LIMIT = 24;

async function gather(q: URLSearchParams): Promise<MemberStatementData> {
  const id = (q.get("m") || "").trim();
  if (!id) throw new ReportError(400, "شناسهٔ عضو (m) الزامی است.");
  const dash = await buildDashboard();
  const member = dash.members.find((m) => m.id === id);
  if (!member) throw new ReportError(404, "عضو یافت نشد.");
  return {
    member,
    parValue: dash.settings.parValue,
    asOfMs: dash.meta.asOf,
    queuePos: dash.queueIds.indexOf(member.id) + 1,
  };
}

function tile(cap: string, val: string, cls = ""): string {
  return `<div class="tile ${cls}"><div class="cap">${cap}</div><div class="val">${val}</div></div>`;
}

function statusPill(m: DashMember): string {
  if (m.behind) return `<span class="pill warn">بدهکار</span>`;
  if (m.status === "inactive") return `<span class="pill muted">غیرفعال</span>`;
  return `<span class="pill ok">فعال</span>`;
}

function identity(m: DashMember): string {
  const initial = esc((m.name || "?").trim().charAt(0) || "?");
  return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
    <div style="width:44px;height:44px;border-radius:11px;background:${TOKENS.accentSoft};color:${TOKENS.accent};
      display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18pt;flex:none">${initial}</div>
    <div style="flex:1;min-width:0">
      <h1 style="margin:0;font-size:20pt;font-weight:700;color:${TOKENS.ink};line-height:1.25">${esc(m.name)}</h1>
      <div style="margin-top:3px;font-size:9pt;color:${TOKENS.ink3}">خانوادهٔ ${esc(m.family)} &nbsp;·&nbsp; ${statusPill(m)}</div>
    </div>
    <div class="kv" style="text-align:left;line-height:1.8">
      <div>تاریخ تولد: <b>${jFullDate(m.dob)}</b></div>
      <div>تاریخ عضویت: <b>${jFullDate(m.createdAt)}</b></div>
    </div>
  </div>`;
}

function summaryStrip(m: DashMember, parValue: number): string {
  const elig = m.loanEligible
    ? `<span class="pill ok">واجد شرایط وام</span>`
    : `<span class="pill muted">واجد شرایط وام نیست</span>`;
  const tiles = [
    `<div class="tile money"><div class="cap">موجودی پس‌انداز</div><div class="hero num">${money(m.savings)}<span style="font-size:8pt;font-weight:500;color:${TOKENS.ink3}"> تومان</span></div></div>`,
    tile("تعداد سهم", `<span class="num">${faDigits(m.nShares)}</span>`),
    tile("سهم‌های تأمین‌شده", `<span class="num">${faDigits(m.fundedShares)} از ${faDigits(m.nShares)}</span>`),
    tile("سقف وام", `<span class="num">${money(m.maxLoan)}</span>`, "money"),
  ].join("");

  let progress = "";
  if (m.funding) {
    progress = `<div style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:8.5pt;color:${TOKENS.ink2};margin-bottom:5px">
        <span><span class="num">${money(m.savings)}</span> از <span class="num">${money(m.fullTarget)}</span> تومان تأمین‌شده</span>
        <span style="font-weight:700;color:${TOKENS.accent}">${pctFa(m.fundedPct)}</span>
      </div>
      <div class="bar"><i style="width:${Math.min(100, Math.max(0, m.fundedPct))}%"></i></div>
    </div>`;
  } else {
    progress = `<div style="margin-top:9px;font-size:8.5pt;color:${TOKENS.accent};font-weight:600">سهم‌ها به‌طور کامل تأمین شده‌اند ✓</div>`;
  }
  const notEligible = m.loanEligible ? "" :
    `<div class="foot-note">حداقل پس‌انداز هر سهم ${moneyT(parValue)} است؛ تا رسیدن به آن، این عضو واجد شرایط وام نیست.</div>`;

  return `<div class="section"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px">
    <h2 class="section-heading">وضعیت پس‌انداز و سهم‌ها</h2>${elig}</div>
    <div class="tile-row">${tiles}</div>${progress}${notEligible}</div>`;
}

function loanPanel(m: DashMember): string {
  const loan = m.loan;
  if (!loan || loan.status !== "active") return "";
  const monthly = loan.monthly || 0;
  const paid = Math.round((loan.principal - loan.outstanding) / (monthly || 1));
  const remPct = loan.principal > 0 ? Math.round((loan.outstanding / loan.principal) * 100) : 0;
  const remColor = loanRemColor(remPct);
  const meta: string[] = [`تاریخ پرداخت وام: <b>${jFullDate(loan.issuedAt)}</b>`];
  if (loan.bankTxnId) meta.push(`کد بانکی: <b class="num">${esc(loan.bankTxnId)}</b>`);
  if (loan.note) meta.push(`یادداشت: <b>${esc(loan.note)}</b>`);
  return `<div class="section"><h2 class="section-heading">وام فعال</h2>
    <div class="panel" style="margin-top:7px">
      <div class="tile-row" style="background:none;border:none">
        ${tile("اصل وام", `<span class="num">${money(loan.principal)}</span>`, "money")}
        ${tile("قسط ماهانه", `<span class="num">${money(monthly)}</span>`)}
        ${tile("ماندهٔ بدهی", `<span class="num" style="color:${remColor}">${money(loan.outstanding)}</span>`)}
      </div>
      <div style="margin-top:11px"><div class="bar"><i style="width:${Math.min(100, Math.max(0, loan.pct))}%;background:${remColor}"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:8.5pt;color:${TOKENS.ink3};margin-top:6px">
          <span><span class="num">${faDigits(paid)}</span> از <span class="num">${faDigits(loan.termMonths)}</span> قسط پرداخت‌شده</span>
          <span style="font-weight:700;color:${remColor}">${pctFa(loan.pct)} بازپرداخت</span>
        </div>
      </div>
      <div class="kv" style="margin-top:9px;border-top:1px solid ${TOKENS.hair2};padding-top:8px">${meta.join(" &nbsp;·&nbsp; ")}</div>
    </div></div>`;
}

function ledger(m: DashMember): string {
  const all: Receipt[] = [...m.seedReceipts, ...m.installmentReceipts];
  all.sort((a, b) => (b.date ?? 0) - (a.date ?? 0)); // newest first
  const recent = all.slice(0, TX_LIMIT).reverse(); // most-recent 24, printed oldest→newest
  const hidden = all.length - recent.length;

  let seedSum = 0;
  let instSum = 0;
  const rows = recent.map((r, i) => {
    const isSeed = r.type === "seed";
    if (isSeed) seedSum += r.amount; else instSum += r.amount;
    const desc: string[] = [];
    if (r.bankTxnId) desc.push(`کد بانکی: <span class="num">${esc(r.bankTxnId)}</span>`);
    if (r.note) desc.push(esc(r.note));
    const dot = isSeed ? TOKENS.accent : TOKENS.ink2;
    return `<tr>
      <td style="text-align:center" class="num">${faDigits(i + 1)}</td>
      <td class="num">${jShortDate(r.date)}</td>
      <td style="text-align:center" class="num">${faDigits(r.no)}</td>
      <td><span class="tag-dot" style="background:${dot}"></span>${isSeed ? "پس‌انداز" : "قسط وام"}</td>
      <td style="color:${TOKENS.ink3}">${desc.join(" · ") || "—"}</td>
      <td class="num col">${money(r.amount)}</td>
    </tr>`;
  }).join("");

  const body = recent.length
    ? rows
    : `<tr><td colspan="6" style="text-align:center;color:${TOKENS.ink3};padding:14px">تراکنشی ثبت نشده است.</td></tr>`;

  const note = hidden > 0
    ? `<div class="foot-note">نمایش ${faDigits(TX_LIMIT)} تراکنش اخیر؛ <span class="num">${faDigits(hidden)}</span> تراکنش قدیمی‌تر در این صورت‌حساب نیامده است.</div>`
    : "";

  return `<div class="section"><h2 class="section-heading">گردش حساب — ${faDigits(TX_LIMIT)} تراکنش اخیر</h2>
    <table class="sheet">
      <thead><tr>
        <th style="text-align:center;width:8%">ردیف</th>
        <th style="width:16%">تاریخ</th>
        <th style="text-align:center;width:13%">شمارهٔ رسید</th>
        <th style="width:16%">نوع</th>
        <th>شرح</th>
        <th class="num col" style="width:18%">مبلغ (تومان)</th>
      </tr></thead>
      <tbody>${body}</tbody>
      <tfoot>
        <tr><td colspan="5" style="text-align:left">جمع پس‌انداز در این دوره</td><td class="num col">${money(seedSum)}</td></tr>
        <tr><td colspan="5" style="text-align:left">جمع اقساط در این دوره</td><td class="num col">${money(instSum)}</td></tr>
      </tfoot>
    </table>${note}</div>`;
}

function footerBlock(d: MemberStatementData): string {
  const m = d.member;
  let queue: string;
  if (m.loanReceived) queue = `در این دوره وام دریافت شده است.`;
  else if (d.queuePos > 0) queue = `نفر <b class="num">${faDigits(d.queuePos)}</b> در صف وام.`;
  else queue = "—";

  const contact: string[] = [];
  m.phones.forEach((p) => contact.push(`<div class="num" style="direction:ltr;text-align:right">${esc(faDigits(p))}</div>`));
  m.accounts.forEach((a) => contact.push(`<div class="num" style="direction:ltr;text-align:right;color:${TOKENS.ink3}">حساب: ${esc(faDigits(a))}</div>`));
  if (!contact.length) contact.push(`<div class="muted">—</div>`);

  const referrer = esc(m.referredByName || m.referredBy || "بدون معرف");

  return `<div class="section"><div class="tile-row" style="gap:10px">
    <div class="panel"><div class="cap" style="font-size:8pt;font-weight:600;color:${TOKENS.ink3};margin-bottom:5px">نوبت وام</div><div style="font-size:9.5pt;color:${TOKENS.ink2}">${queue}</div></div>
    <div class="panel"><div class="cap" style="font-size:8pt;font-weight:600;color:${TOKENS.ink3};margin-bottom:5px">اطلاعات تماس</div>${contact.join("")}</div>
    <div class="panel"><div class="cap" style="font-size:8pt;font-weight:600;color:${TOKENS.ink3};margin-bottom:5px">معرف</div><div style="font-size:9.5pt;color:${TOKENS.ink2}">${referrer}</div></div>
  </div></div>`;
}

function render(d: MemberStatementData): ReportResult {
  const asOf = jMonthYear(d.asOfMs);
  const body =
    identity(d.member) +
    summaryStrip(d.member, d.parValue) +
    loanPanel(d.member) +
    ledger(d.member) +
    footerBlock(d) +
    `<div class="foot-note" style="text-align:center;margin-top:14px;border-top:1px solid ${TOKENS.hair};padding-top:10px">صورت‌حساب صندوق مهر۱۱۰ · وضعیت تا تاریخِ ${asOf}</div>`;

  const html = pageDocument({ docTitle: `صورت‌حساب ${d.member.name}`, headerTitle: REPORT_TITLE, asOf, body });
  return {
    html,
    headerTemplate: printHeaderTemplate(REPORT_TITLE, asOf),
    footerTemplate: printFooterTemplate(),
    filenameSlug: `member-statement-${d.member.id}`,
  };
}

export const memberStatement: ReportDef<MemberStatementData> = {
  id: "member-statement",
  authScope: "admin",
  scopeMemberId: (q) => (q.get("m") || "").trim() || null,
  gather,
  render,
};
