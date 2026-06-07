/* ============================================================
   Money helpers — integer Toman only. No floating-point arithmetic.
   ============================================================ */
import { HttpsError } from "firebase-functions/https";

/** Assert a value is a non-negative safe integer amount of Toman. */
export function assertAmount(v: unknown, label = "amount"): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new HttpsError("invalid-argument", `${label} must be a number.`);
  }
  if (!Number.isInteger(v)) {
    throw new HttpsError("invalid-argument", `${label} must be an integer (Toman has no decimals).`);
  }
  if (v < 0) {
    throw new HttpsError("invalid-argument", `${label} must not be negative.`);
  }
  if (v > Number.MAX_SAFE_INTEGER) {
    throw new HttpsError("invalid-argument", `${label} is too large.`);
  }
  return v;
}

/** Positive integer (e.g. principal, term). */
export function assertPositiveInt(v: unknown, label = "value"): number {
  const n = assertAmount(v, label);
  if (n <= 0) throw new HttpsError("invalid-argument", `${label} must be greater than zero.`);
  return n;
}

/** monthly = round(principal / termMonths) using integer-safe rounding. */
export function monthlyOf(principal: number, termMonths: number): number {
  if (termMonths <= 0) return principal;
  return Math.round(principal / termMonths);
}

/** integer percentage, clamped to [0,100]. */
export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}
