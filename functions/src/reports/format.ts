/* ============================================================
   reports/format.ts — server-side Farsi formatting for printed reports.
   Mirrors the client helpers in web/api.js / web/ui.js so PDFs match the UI:
   integer Toman with fa-IR grouping, Persian digits, Jalali (Shamsi) dates.
   Pure functions, no deps. Node 20 ships full ICU (persian calendar + fa-IR).
   ============================================================ */

/** Persian digit substitution only (no thousands grouping). */
export function faDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** Integer Toman with fa-IR grouping + Persian digits, e.g. ۵٬۷۸۰٬۰۰۰ */
export function money(n: number): string {
  return Math.round(Number(n) || 0).toLocaleString("fa-IR");
}

/** money() suffixed with the currency word. */
export function moneyT(n: number): string {
  return money(n) + " تومان";
}

/** Integer percent with the Persian percent sign, e.g. ۸۵٪ */
export function pctFa(n: number): string {
  return faDigits(Math.round(Number(n) || 0)) + "٪";
}

const jMonthYearFmt = new Intl.DateTimeFormat("fa-IR", { calendar: "persian", month: "long", year: "numeric", timeZone: "Asia/Tehran" });
const jFullFmt = new Intl.DateTimeFormat("fa-IR", { calendar: "persian", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran" });
const jShortFmt = new Intl.DateTimeFormat("fa-IR", { calendar: "persian", year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tehran" });

/** "خرداد ۱۴۰۵" — null/0 → "—". */
export function jMonthYear(ms: number | null | undefined): string {
  return ms ? jMonthYearFmt.format(new Date(ms)) : "—";
}
/** "۲۷ خرداد ۱۴۰۵" — null/0 → "—". */
export function jFullDate(ms: number | null | undefined): string {
  return ms ? jFullFmt.format(new Date(ms)) : "—";
}
/** "۱۴۰۵/۰۳/۲۷" — compact for table date columns; null/0 → "—". */
export function jShortDate(ms: number | null | undefined): string {
  return ms ? jShortFmt.format(new Date(ms)) : "—";
}

/** HTML-escape any value before interpolation into a template (member-entered
 *  names, notes, bank refs, etc. are untrusted). */
export function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
