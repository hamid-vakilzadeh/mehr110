/* ============================================================
   reports/registry.ts — the extensibility seam.
   Each report is a self-contained ReportDef: how to gather its data, how to
   render it to HTML, and what auth it needs. Adding a new report = write one
   template module that exports a ReportDef, then add it to REPORTS below.
   Shared contracts (ReportDef/ReportResult/ReportError) live in ./types to
   keep this dependency-light and cycle-free.
   ============================================================ */
import type { ReportDef } from "./types";
import { memberStatement } from "./templates/member-statement";
import { fundSummary } from "./templates/fund-summary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REPORTS: Record<string, ReportDef<any>> = {
  [memberStatement.id]: memberStatement,
  [fundSummary.id]: fundSummary,
};
