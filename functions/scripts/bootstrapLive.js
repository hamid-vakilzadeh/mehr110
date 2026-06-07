#!/usr/bin/env node
/* ============================================================
   One-time LIVE bootstrap for صندوق مهر۱۱۰.

   Creates the manager (admin) account, grants the role=admin custom
   claim, and seeds the starter dataset — all via REST, using YOUR
   already-authenticated gcloud session (no service-account key, no
   secrets committed).

   PREREQUISITES (already done if you followed the README):
     • Blaze plan enabled, Functions + Firestore deployed
     • Firebase Auth → Email/Password provider enabled in the console
     • gcloud is logged in as a project owner/editor:  gcloud auth login

   USAGE:
     node functions/scripts/bootstrapLive.js <managerEmail> [password]
     # password optional — a strong one is generated and printed if omitted.

   Example:
     node functions/scripts/bootstrapLive.js vhamidreza@gmail.com
   ============================================================ */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT = process.env.PROJECT || "mehr110-62009";
const REGION = process.env.REGION || "us-central1";
const email = process.argv[2];
let password = process.argv[3];

if (!email) {
  console.error("Usage: node functions/scripts/bootstrapLive.js <managerEmail> [password]");
  process.exit(1);
}
if (!password) {
  password = "Mehr110!" + crypto.randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
}

// web API key (public) from web/firebase-config.js
const cfg = fs.readFileSync(path.join(__dirname, "..", "..", "web", "firebase-config.js"), "utf8");
const API_KEY = process.env.API_KEY || (cfg.match(/apiKey:\s*"([^"]+)"/) || [])[1];
if (!API_KEY) { console.error("Could not read apiKey from web/firebase-config.js"); process.exit(1); }

const sh = (c) => execSync(c, { encoding: "utf8" }).trim();
const GTOKEN = process.env.GCLOUD_TOKEN || sh("gcloud auth print-access-token");
const SEED_URL =
  process.env.SEED_URL ||
  sh(`gcloud functions describe seedDatabase --region=${REGION} --gen2 --project ${PROJECT} --format="value(serviceConfig.uri)"`);

const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

(async () => {
  // 1) create manager
  let r = await j(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }));
  let uid;
  if (r.status === 200) { uid = r.body.localId; console.log("1) created manager account:", uid); }
  else if (r.body?.error?.message === "EMAIL_EXISTS") {
    const s = await j(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }));
    if (s.status !== 200) { console.error("   account exists but password didn't match. Pass the existing password as the 2nd arg."); process.exit(3); }
    uid = s.body.localId; console.log("1) manager account already existed:", uid);
  } else { console.error("1) signUp failed:", JSON.stringify(r.body)); process.exit(2); }

  // 2) grant role=admin
  r = await j(await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GTOKEN}`, "x-goog-user-project": PROJECT, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ role: "admin" }) }),
  }));
  if (r.status !== 200) { console.error("2) granting admin failed:", JSON.stringify(r.body)); process.exit(4); }
  console.log("2) granted role=admin");

  // 3) fresh ID token carrying the admin claim
  r = await j(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }));
  if (r.status !== 200) { console.error("3) re-signin failed:", JSON.stringify(r.body)); process.exit(5); }
  const idToken = r.body.idToken;

  // 4) seed the database (admin-only callable)
  r = await j(await fetch(SEED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { force: true } }),
  }));
  if (r.status !== 200) { console.error("4) seed failed:", JSON.stringify(r.body)); process.exit(6); }
  console.log("4) seeded:", JSON.stringify(r.body.result || r.body));

  console.log("\n========================================");
  console.log("LIVE BOOTSTRAP COMPLETE");
  console.log("  manager email:    " + email);
  console.log("  manager password: " + password);
  console.log("  (store it safely; change it anytime in the Firebase console)");
  console.log("========================================");
})().catch((e) => { console.error("bootstrap crashed:", e); process.exit(9); });
