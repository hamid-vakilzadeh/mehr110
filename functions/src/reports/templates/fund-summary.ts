/* ============================================================
   reports/templates/fund-summary.ts — گزارش جامع صندوق (paper).
   Fund-wide overview: KPI band, family breakdown, full member roster,
   and the loan rotation queue. Admin-only.
   ============================================================ */
import { buildDashboard } from "../../dashboard";
import type { ReportDef, ReportResult } from "../types";
import { pageDocument, printHeaderTemplate, printFooterTemplate, TOKENS } from "../theme";
import { esc, faDigits, money, pctFa, jMonthYear } from "../format";

type Dash = Awaited<ReturnType<typeof buildDashboard>>;

const REPORT_TITLE = "گزارش جامع صندوق";

async function gather(): Promise<Dash> {
  return buildDashboard();
}

function tile(cap: string, val: string, cls = ""): string {
  return `<div class="tile ${cls}"><div class="cap">${cap}</div><div class="val num">${val}</div></div>`;
}

function kpiBand(d: Dash): string {
  const k = d.kpis;
  const row1 = [
    tile("کل دارایی صندوق", money(k.totalPool), "money"),
    tile("موجودی در دسترس", money(k.available), "money"),
    tile("ماندهٔ وام‌ها", money(k.outstanding), "money"),
    tile("وام‌های فعال", faDigits(k.activeLoans)),
  ].join("");
  const row2 = [
    tile("تعداد اعضا", faDigits(k.memberCount)),
    tile("تعداد خانواده‌ها", faDigits(k.familiesCount)),
    tile("مجموع سهم‌ها", faDigits(k.totalShares)),
    tile("نیازمند پیگیری", faDigits(k.needsAttention), k.needsAttention > 0 ? "warnv" : ""),
  ].join("");
  return `<div class="section"><div class="tile-row">${row1}</div>
    <div class="tile-row" style="margin-top:8px">${row2}</div></div>`;
}

function familyTable(d: Dash): string {
  const total = d.kpis.totalPool || 0;
  const rows = d.families.map((f, i) => {
    const share = total > 0 ? Math.round((f.balance / total) * 100) : 0;
    return `<tr>
      <td style="text-align:center" class="num">${faDigits(i + 1)}</td>
      <td>${esc(f.family)}</td>
      <td style="text-align:center" class="num">${faDigits(f.memberCount)}</td>
      <td style="text-align:center" class="num">${faDigits(f.shares)}</td>
      <td class="num col">${money(f.balance)}</td>
      <td style="text-align:center" class="num">${pctFa(f.fundedPct)}</td>
      <td style="text-align:center" class="num">${pctFa(share)}</td>
    </tr>`;
  }).join("");
  const sumMembers = d.families.reduce((t, f) => t + f.memberCount, 0);
  const sumShares = d.families.reduce((t, f) => t + f.shares, 0);
  return `<div class="section"><h2 class="section-heading">تفکیک بر اساس خانواده</h2>
    <table class="sheet">
      <thead><tr>
        <th style="text-align:center;width:7%">ردیف</th><th>خانواده</th>
        <th style="text-align:center;width:11%">اعضا</th><th style="text-align:center;width:12%">سهم‌ها</th>
        <th class="num col" style="width:20%">پس‌انداز (تومان)</th>
        <th style="text-align:center;width:12%">تأمین</th><th style="text-align:center;width:13%">سهم از کل</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="2" style="text-align:left">جمع کل</td>
        <td style="text-align:center" class="num">${faDigits(sumMembers)}</td>
        <td style="text-align:center" class="num">${faDigits(sumShares)}</td>
        <td class="num col">${money(total)}</td>
        <td style="text-align:center" class="num">—</td>
        <td style="text-align:center" class="num">${pctFa(100)}</td>
      </tr></tfoot>
    </table></div>`;
}

function roster(d: Dash): string {
  const queuePos = (id: string) => d.queueIds.indexOf(id) + 1;
  // group by family (households together), then savings desc within family
  const sorted = [...d.members].sort((a, b) =>
    a.family === b.family ? b.savings - a.savings : a.family < b.family ? -1 : 1
  );
  const rows = sorted.map((m, i) => {
    const pos = m.loanReceived ? "✓" : (queuePos(m.id) > 0 ? faDigits(queuePos(m.id)) : "—");
    const statusPill = m.behind
      ? `<span class="pill warn">بدهکار</span>`
      : m.status === "inactive" ? `<span class="pill muted">غیرفعال</span>` : `<span class="pill ok">فعال</span>`;
    return `<tr class="${m.behind ? "behind" : ""}">
      <td style="text-align:center" class="num">${faDigits(i + 1)}</td>
      <td>${esc(m.name)}</td>
      <td>${esc(m.family)}</td>
      <td style="text-align:center" class="num">${faDigits(m.nShares)}</td>
      <td class="num col">${money(m.savings)}</td>
      <td style="text-align:center" class="num">${pctFa(m.fundedPct)}</td>
      <td class="num col">${m.loan ? money(m.loan.outstanding) : "—"}</td>
      <td style="text-align:center">${statusPill}</td>
      <td style="text-align:center" class="num">${pos}</td>
    </tr>`;
  }).join("");
  const k = d.kpis;
  return `<div class="section page-break"><h2 class="section-heading">فهرست اعضا</h2>
    <table class="sheet">
      <thead><tr>
        <th style="text-align:center;width:6%">ردیف</th><th>نام</th><th>خانواده</th>
        <th style="text-align:center;width:8%">سهم‌ها</th><th class="num col" style="width:16%">پس‌انداز</th>
        <th style="text-align:center;width:9%">تأمین</th><th class="num col" style="width:15%">ماندهٔ وام</th>
        <th style="text-align:center;width:11%">وضعیت</th><th style="text-align:center;width:9%">نوبت وام</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="3" style="text-align:left">جمع کل (${faDigits(k.memberCount)} عضو)</td>
        <td style="text-align:center" class="num">${faDigits(k.totalShares)}</td>
        <td class="num col">${money(k.totalPool)}</td>
        <td style="text-align:center" class="num">—</td>
        <td class="num col">${money(k.outstanding)}</td>
        <td colspan="2"></td>
      </tr></tfoot>
    </table></div>`;
}

function rotation(d: Dash): string {
  const byId = new Map(d.members.map((m) => [m.id, m]));
  const nextName = d.loanNextId ? esc(byId.get(d.loanNextId)?.name || "—") : "—";
  const items = d.queueIds.map((id, i) => {
    const m = byId.get(id);
    if (!m) return "";
    return `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid ${TOKENS.hair2};font-size:9pt">
      <span class="num" style="color:${TOKENS.accent};font-weight:700;width:34px">نفر ${faDigits(i + 1)}</span>
      <span style="color:${TOKENS.ink}">${esc(m.name)}</span>
      <span style="color:${TOKENS.ink3}">خانوادهٔ ${esc(m.family)}</span>
    </div>`;
  }).join("");
  const summary = `<div style="font-size:9pt;color:${TOKENS.ink2};margin:4px 0 8px">
    <span class="num">${faDigits(d.loanReceivedCount)}</span> از <span class="num">${faDigits(d.loanTotal)}</span> نفر در این دور وام گرفته‌اند؛ نفر بعدی: <b>${nextName}</b>.</div>`;
  return `<div class="section"><h2 class="section-heading">نوبت و گردش وام — دور ${faDigits(d.loanRound)}</h2>
    ${summary}${items || `<div class="muted" style="font-size:9pt">صف وام خالی است.</div>`}</div>`;
}

function render(d: Dash): ReportResult {
  const asOf = jMonthYear(d.meta.asOf);
  const cover = `<div style="margin-bottom:6px">
    <h1 style="margin:0;font-size:22pt;font-weight:700;color:${TOKENS.ink}">صندوق مهر۱۱۰</h1>
    <div style="font-size:10.5pt;color:${TOKENS.ink2};margin-top:2px">${REPORT_TITLE} · وضعیت تا تاریخِ ${asOf}</div>
  </div>`;
  const body =
    cover +
    kpiBand(d) +
    familyTable(d) +
    roster(d) +
    rotation(d) +
    `<div class="foot-note" style="text-align:center;margin-top:14px;border-top:1px solid ${TOKENS.hair};padding-top:10px">ارقام به تومان و تا تاریخِ ${asOf} است · صندوق مهر۱۱۰</div>`;

  const html = pageDocument({ docTitle: "گزارش جامع صندوق مهر۱۱۰", headerTitle: REPORT_TITLE, asOf, body });
  return {
    html,
    headerTemplate: printHeaderTemplate(REPORT_TITLE, asOf),
    footerTemplate: printFooterTemplate(),
    filenameSlug: "fund-summary",
  };
}

export const fundSummary: ReportDef<Dash> = {
  id: "fund-summary",
  authScope: "admin",
  gather,
  render,
};
