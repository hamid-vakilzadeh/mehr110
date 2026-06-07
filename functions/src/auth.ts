/* ============================================================
   Auth guards. The manager is an admin (custom claim role=admin).
   Every admin callable must pass through requireAdmin().
   ============================================================ */
import { HttpsError } from "firebase-functions/https";
import type { CallableRequest } from "firebase-functions/https";

/** Require an authenticated caller; returns the uid. */
export function requireAuth(req: CallableRequest): string {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "ابتدا وارد شوید."); // must sign in
  }
  return req.auth.uid;
}

/** Require an authenticated caller with role=admin custom claim. */
export function requireAdmin(req: CallableRequest): string {
  const uid = requireAuth(req);
  const role = req.auth?.token?.role;
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "این عملیات فقط برای مدیر صندوق مجاز است."); // admin only
  }
  return uid;
}

/** Admin OR the member reading their own data (member-facing statement). */
export function requireSelfOrAdmin(req: CallableRequest, memberId: string): string {
  const uid = requireAuth(req);
  const role = req.auth?.token?.role;
  if (role === "admin" || uid === memberId) return uid;
  throw new HttpsError("permission-denied", "دسترسی غیرمجاز.");
}
