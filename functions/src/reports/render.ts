/* ============================================================
   reports/render.ts — HTML string → A4 PDF via headless Chromium.
   puppeteer-core + @sparticuz/chromium are imported LAZILY (inside launch)
   so the heavy Chromium module never loads on the cold start of the other
   (lightweight) callables — only when a report is actually rendered.
   Serverless (Cloud Functions/Run): the bundled Chromium binary.
   Local dev: system Chrome via CHROME_PATH or the common macOS path.
   ============================================================ */
import type { Browser } from "puppeteer-core";

const isServerless = !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.FUNCTION_SIGNATURE_TYPE);

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter((p): p is string => !!p);

async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const viewport = { width: 1240, height: 1754, deviceScaleFactor: 2 };

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    chromium.setGraphicsMode = false; // no webgl needed for PDF; saves memory
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: "shell",
      defaultViewport: viewport,
    });
  }

  const { existsSync } = await import("fs");
  const execPath = LOCAL_CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!execPath) {
    throw new Error("No local Chrome found; set CHROME_PATH to a Chrome/Chromium binary.");
  }
  return puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    defaultViewport: viewport,
  });
}

export interface PdfOptions {
  headerTemplate?: string;
  footerTemplate?: string;
}

/** Render a complete HTML document string to an A4 PDF buffer. */
export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    // ensure the inlined @font-face has parsed before painting
    try { await page.evaluateHandle("document.fonts.ready"); } catch { /* non-fatal */ }
    const hasChrome = !!(opts.headerTemplate || opts.footerTemplate);
    const data = await page.pdf({
      format: "a4",
      printBackground: true,
      displayHeaderFooter: hasChrome,
      headerTemplate: opts.headerTemplate || "<span></span>",
      footerTemplate: opts.footerTemplate || "<span></span>",
      // header/footer repeat in these margins; sides match @page.
      margin: hasChrome
        ? { top: "26mm", bottom: "18mm", left: "14mm", right: "14mm" }
        : { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
    });
    return Buffer.from(data);
  } finally {
    await browser.close();
  }
}
