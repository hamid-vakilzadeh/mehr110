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

function roster(d: Dash): string {
  const queuePos = (id: string) => d.queueIds.indexOf(id) + 1;
  // sort by each member's turn in the loan rotation (queue order); members not
  // in the rotation fall to the end, tie-broken by name.
  const turnIndex = (id: string) => {
    const i = d.loanOrderIds.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const sorted = [...d.members].sort((a, b) => {
    const ta = turnIndex(a.id), tb = turnIndex(b.id);
    if (ta !== tb) return ta - tb;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
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
  return `<div class="section"><h2 class="section-heading">فهرست اعضا</h2>
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

function render(d: Dash): ReportResult {
  const asOf = jMonthYear(d.meta.asOf);
  const cover = `<div style="margin-bottom:6px">
    <h1 style="margin:0;font-size:22pt;font-weight:700;color:${TOKENS.ink}">صندوق مهر۱۱۰</h1>
    <div style="font-size:10.5pt;color:${TOKENS.ink2};margin-top:2px">${REPORT_TITLE} · وضعیت تا تاریخِ ${asOf}</div>
  </div>`;
  const body =
    cover +
    kpiBand(d) +
    roster(d) +
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
