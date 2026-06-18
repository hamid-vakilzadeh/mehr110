/* ============================================================
   reports/http.ts — the single HTTP entry for the reports API.
   GET /reports/<id>?<params>[&format=html]  with  Authorization: Bearer <idToken>.
   Verifies the Firebase ID token, enforces the report's authScope, gathers
   data, renders HTML, and returns application/pdf (or text/html for preview).
   This is the only onRequest function; all other endpoints stay onCall, and
   its heavy options (1GiB / Chromium) are isolated here.
   ============================================================ */
import { onRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import "../admin"; // ensure the default Admin app is initialized
import { REPORTS } from "./registry";
import { ReportError } from "./types";
import { htmlToPdf } from "./render";

export const reports = onRequest(
  // concurrency:1 → each instance renders one PDF at a time, so maxInstances:3
  // bounds total concurrent Chromium renders to 3 (no per-instance OOM on 1GiB).
  { region: "us-central1", memory: "1GiB", timeoutSeconds: 120, maxInstances: 3, concurrency: 1, cors: true },
  async (req, res): Promise<void> => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
      }

      // report id = last non-empty path segment (works behind /reports/** rewrite or direct).
      const segs = (req.path || "").split("/").filter(Boolean);
      const id = segs.length ? segs[segs.length - 1] : "";
      const def = REPORTS[id];
      if (!def) {
        res.status(404).json({ error: "گزارش ناشناخته است." });
        return;
      }

      // auth — verify the Firebase ID token from the Authorization header.
      const authz = req.get("authorization") || "";
      const bearer = authz.match(/^Bearer\s+(.+)$/i);
      if (!bearer) {
        res.status(401).json({ error: "ابتدا وارد شوید." });
        return;
      }
      let decoded;
      try {
        decoded = await getAuth().verifyIdToken(bearer[1].trim());
      } catch {
        res.status(401).json({ error: "نشست نامعتبر است." });
        return;
      }
      const isAdmin = decoded.role === "admin";

      const q = new URLSearchParams(req.url.split("?")[1] || "");

      // authScope enforcement (mirrors auth.ts requireAdmin / requireSelfOrAdmin).
      if (def.authScope === "admin") {
        if (!isAdmin) {
          res.status(403).json({ error: "این گزارش فقط برای مدیر صندوق مجاز است." });
          return;
        }
      } else {
        const target = def.scopeMemberId ? def.scopeMemberId(q) : null;
        if (!isAdmin && decoded.uid !== target) {
          res.status(403).json({ error: "دسترسی غیرمجاز." });
          return;
        }
      }

      const data = await def.gather(q);
      const result = def.render(data);

      if ((q.get("format") || "").toLowerCase() === "html") {
        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("Cache-Control", "no-store");
        res.status(200).send(result.html);
        return;
      }

      const pdf = await htmlToPdf(result.html, {
        headerTemplate: result.headerTemplate,
        footerTemplate: result.footerTemplate,
      });
      res.set("Content-Type", "application/pdf");
      res.set("Content-Disposition", `inline; filename="${result.filenameSlug}.pdf"`);
      res.set("Cache-Control", "no-store");
      res.status(200).send(pdf);
    } catch (e) {
      if (e instanceof ReportError) {
        res.status(e.status).json({ error: e.message });
        return;
      }
      console.error("report render failed:", e);
      res.status(500).json({ error: "خطا در ساخت گزارش." });
    }
  }
);
