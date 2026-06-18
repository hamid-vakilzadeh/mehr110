/* ============================================================
   reports/theme.ts — the shared paper visual system for all reports.
   • TOKENS mirror web/tokens.css (as literal hex for print fidelity /
     greyscale legibility) — keep in sync if the web palette changes.
   • Vazirmatn (OFL) + the logo are read from ../assets at first use and
     inlined as base64 so Chromium renders deterministically offline (no
     dependency on the Google Fonts CDN at render time).
   • pageDocument() assembles a full RTL HTML doc; the on-page header/footer
     are screen-only (for ?format=html preview) — the PDF uses Puppeteer's
     native header/footer templates (printHeaderTemplate/printFooterTemplate)
     so page numbers repeat correctly in the page margins.
   ============================================================ */
import { readFileSync } from "fs";
import { join } from "path";
import { esc, jFullDate } from "./format";

// MIRRORS web/tokens.css — warm-neutral + evergreen, expressed as hex for print.
export const TOKENS = {
  paper: "#faf8f4",
  surface: "#fefdfb",
  surface2: "#f3f0ea",
  ink: "#2c2825",
  ink2: "#5c554e",
  ink3: "#847c72",
  hair: "#e4ded5",
  hair2: "#ece7df",
  accent: "#164f2e",
  accentSoft: "#eaf0ec",
  accentLine: "#b9cdc0",
  warn: "#9c5a35",
  warnSoft: "#f4ebe5",
  warnLine: "#d8bca9",
} as const;

// ---- lazily inlined assets (cached across warm invocations) ----
let _assets: { fontCss: string; logo: string } | null = null;
function assets(): { fontCss: string; logo: string } {
  if (_assets) return _assets;
  const dir = join(__dirname, "..", "assets");
  const b64 = (f: string) => readFileSync(join(dir, f)).toString("base64");
  const face = (file: string, weight: number) =>
    `@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:${weight};` +
    `src:url(data:font/woff2;base64,${b64(file)}) format('woff2');font-display:swap;}`;
  const fontCss =
    face("Vazirmatn-Regular.woff2", 400) +
    face("Vazirmatn-SemiBold.woff2", 600) +
    face("Vazirmatn-Bold.woff2", 700);
  const logo = `data:image/png;base64,${b64("logo.png")}`;
  _assets = { fontCss, logo };
  return _assets;
}

/** The brand logo as a data: URI (for templates / on-page chrome). */
export function logoDataUri(): string {
  return assets().logo;
}

/** Full stylesheet (font faces + tokens + the shared component system). */
export function baseCss(): string {
  const t = TOKENS;
  return `${assets().fontCss}
:root{
  --paper:${t.paper};--surface:${t.surface};--surface-2:${t.surface2};
  --ink:${t.ink};--ink-2:${t.ink2};--ink-3:${t.ink3};--hair:${t.hair};--hair-2:${t.hair2};
  --accent:${t.accent};--accent-soft:${t.accentSoft};--accent-line:${t.accentLine};
  --warn:${t.warn};--warn-soft:${t.warnSoft};--warn-line:${t.warnLine};
}
@page{ size:A4 portrait; } /* margins come from page.pdf() so content clears the header/footer */
*{ box-sizing:border-box; letter-spacing:normal; }
html{ direction:rtl; }
body{ margin:0; font-family:'Vazirmatn',system-ui,sans-serif; color:var(--ink-2);
  font-size:9.5pt; line-height:1.7; background:var(--surface);
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.num{ direction:ltr; unicode-bidi:plaintext; font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1; }

/* ---- section heading ---- */
.section{ margin:16px 0 9px; }
.section-heading{ break-after:avoid; font-size:12.5pt; font-weight:700; color:var(--ink-2);
  border-right:3px solid var(--accent); padding-right:9px; margin:0; }

/* ---- stat tiles ---- */
.tile-row{ display:flex; gap:8px; break-inside:avoid; }
.tile{ flex:1; background:var(--surface-2); border:1px solid var(--hair); border-radius:9px; padding:9px 11px; min-width:0; }
.tile .cap{ font-size:8pt; font-weight:600; color:var(--ink-3); }
.tile .val{ font-size:13pt; font-weight:600; color:var(--ink); margin-top:3px; }
.tile.money .val{ color:var(--accent); }
.tile.warnv .val{ color:var(--warn); }
.tile .hero{ font-size:19pt; font-weight:700; color:var(--accent); margin-top:2px; }

/* ---- pills ---- */
.pill{ display:inline-block; font-size:8pt; font-weight:600; padding:2px 9px; border-radius:99px; white-space:nowrap; }
.pill.ok{ color:var(--accent); background:var(--accent-soft); border:1px solid var(--accent-line); }
.pill.muted{ color:var(--ink-3); background:var(--surface-2); border:1px solid var(--hair); }
.pill.warn{ color:var(--warn); background:var(--warn-soft); border:1px solid var(--warn-line); }

/* ---- progress bar ---- */
.bar{ height:7px; background:var(--surface-2); border-radius:99px; overflow:hidden; }
.bar > i{ display:block; height:100%; background:var(--accent); border-radius:99px; }

/* ---- panel / card ---- */
.panel{ background:var(--surface); border:1px solid var(--hair); border-radius:11px; padding:12px 14px; break-inside:avoid; }

/* ---- key/value ---- */
.kv{ font-size:9pt; color:var(--ink-3); }
.kv b{ color:var(--ink-2); font-weight:600; }

/* ---- hairline tables ---- */
table.sheet{ width:100%; border-collapse:collapse; margin-top:6px; }
table.sheet thead{ display:table-header-group; }
table.sheet tfoot{ display:table-footer-group; }
table.sheet th{ font-size:8.5pt; font-weight:700; color:var(--ink-3); text-align:right;
  padding:6px 8px; border-bottom:1.5px solid var(--ink-3); white-space:nowrap; }
table.sheet td{ font-size:9pt; color:var(--ink); padding:6px 8px; border-bottom:1px solid var(--hair); }
table.sheet tbody tr{ break-inside:avoid; }
table.sheet tbody tr:nth-child(even){ background:var(--paper); }
table.sheet tr.behind{ background:var(--warn-soft); }
table.sheet tfoot td{ font-size:9pt; font-weight:700; color:var(--ink); background:var(--surface-2);
  border-top:1.5px solid var(--accent); border-bottom:none; }
.num.col{ text-align:left; }
th.num.col{ text-align:left; }
.tag-dot{ display:inline-block; width:7px; height:7px; border-radius:99px; margin-left:5px; vertical-align:middle; }

.foot-note{ font-size:8pt; color:var(--ink-3); margin-top:8px; line-height:1.6; }
.muted{ color:var(--ink-3); }
.page-break{ break-before:page; }

/* ---- on-page chrome: screen preview only (PDF uses Puppeteer templates) ---- */
.screen-chrome{ display:none; }
@media print{ .screen-chrome{ display:none !important; } }
@media screen{
  body{ background:#e9e6e0; padding:24px 0; }
  .sheet-page{ width:210mm; min-height:297mm; margin:0 auto; background:var(--surface);
    padding:14mm; box-shadow:0 2px 14px rgba(0,0,0,.14); }
  .screen-chrome{ display:block; }
  .screen-chrome.head{ display:flex; align-items:center; justify-content:space-between;
    border-bottom:1px solid var(--hair); padding-bottom:8px; margin-bottom:14px; }
  .screen-chrome.foot{ border-top:1px solid var(--hair); padding-top:8px; margin-top:18px;
    display:flex; justify-content:space-between; font-size:8pt; color:var(--ink-3); }
}
`;
}

/** Assemble a full RTL HTML document. `body` is the report-specific content. */
export function pageDocument(opts: { docTitle: string; headerTitle: string; asOf: string; body: string }): string {
  const logo = logoDataUri();
  const screenHead = `<div class="screen-chrome head">
    <div style="display:flex;align-items:center;gap:8px">
      <img src="${logo}" style="width:26px;height:26px;border-radius:6px"/>
      <b style="font-size:12pt;color:${TOKENS.ink}">صندوق مهر۱۱۰</b>
    </div>
    <div style="font-size:10pt;font-weight:600;color:${TOKENS.accent}">${opts.headerTitle}</div>
    <div style="font-size:8.5pt;color:${TOKENS.ink3}">تا تاریخِ ${opts.asOf}</div>
  </div>`;
  const screenFoot = `<div class="screen-chrome foot">
    <span>این سند محرمانه است</span><span>صندوق مهر۱۱۰</span>
  </div>`;
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<title>${esc(opts.docTitle)}</title><style>${baseCss()}</style></head>
<body><div class="sheet-page">${screenHead}${opts.body}${screenFoot}</div></body></html>`;
}

/** Puppeteer print header template — repeats in the top page margin. */
export function printHeaderTemplate(headerTitle: string, asOf: string): string {
  const { fontCss, logo } = assets();
  return `<div dir="rtl" style="width:100%;padding:7mm 14mm 0;box-sizing:border-box;font-family:'Vazirmatn',sans-serif;color:${TOKENS.ink2};">
  <style>${fontCss}</style>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${TOKENS.hair};padding-bottom:3mm;">
    <div style="display:flex;align-items:center;gap:6px;">
      <img src="${logo}" style="width:22px;height:22px;border-radius:5px;"/>
      <span style="font-size:11pt;font-weight:700;color:${TOKENS.ink};">صندوق مهر۱۱۰</span>
    </div>
    <div style="font-size:9.5pt;font-weight:600;color:${TOKENS.accent};">${headerTitle}</div>
    <div style="font-size:8.5pt;color:${TOKENS.ink3};">تا تاریخِ ${asOf}</div>
  </div>
</div>`;
}

/** Puppeteer print footer template — repeats in the bottom page margin. */
export function printFooterTemplate(): string {
  const { fontCss } = assets();
  const generated = jFullDate(Date.now());
  return `<div dir="rtl" style="width:100%;padding:0 14mm 5mm;box-sizing:border-box;font-family:'Vazirmatn',sans-serif;font-size:7.5pt;color:${TOKENS.ink3};">
  <style>${fontCss}</style>
  <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${TOKENS.hair};padding-top:2mm;">
    <div>صفحه <span class="pageNumber"></span> از <span class="totalPages"></span></div>
    <div>این سند محرمانه است</div>
    <div>تاریخ صدور: ${generated}</div>
  </div>
</div>`;
}
