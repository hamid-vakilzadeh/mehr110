/* ============================================================
   reports/types.ts — shared report contracts (no imports → no cycles).
   Templates and the registry both depend on this; it depends on nothing.
   ============================================================ */

/** Thrown by gather() to map to an HTTP status (e.g. 400 bad params, 404 not found). */
export class ReportError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReportError";
  }
}

/** The rendered output: a full HTML document + Puppeteer print header/footer. */
export interface ReportResult {
  html: string;
  headerTemplate: string;
  footerTemplate: string;
  filenameSlug: string; // ascii slug for Content-Disposition
}

/** A report definition. D is the gathered-data shape passed to render(). */
export interface ReportDef<D> {
  id: string;
  authScope: "admin" | "self-or-admin";
  /** for self-or-admin: which memberId this report is scoped to (else null). */
  scopeMemberId?: (q: URLSearchParams) => string | null;
  gather: (q: URLSearchParams) => Promise<D>;
  render: (data: D) => ReportResult;
}
