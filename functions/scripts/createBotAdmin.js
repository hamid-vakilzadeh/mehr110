#!/usr/bin/env node
/* ============================================================
   Create (or reuse) a dedicated "bot" admin account for the
   mehr110-mcp server / Telegram agent, and grant role=admin.

   Admin SDK createUser bypasses the public sign-up lock, so this
   works even with "Enable create" disabled in the Auth console.

   Credentials (NEVER commit): use application-default credentials —
     gcloud auth application-default login
   …or a service account:
     export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json

   Usage:
     node functions/scripts/createBotAdmin.js <email> <password> ["Display Name"]
   ============================================================ */
const admin = require("firebase-admin");

const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] || "ربات مهر۱۱۰";
if (!email || !password) {
  console.error('Usage: node functions/scripts/createBotAdmin.js <email> <password> ["Display Name"]');
  process.exit(1);
}

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "mehr110-62009",
});

(async () => {
  try {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`• account already exists: ${user.uid}`);
    } catch (e) {
      if (e.code !== "auth/user-not-found") throw e;
      user = await admin.auth().createUser({ email, password, displayName, emailVerified: true });
      console.log(`✓ created bot account: ${user.uid}`);
    }
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    console.log(`✓ granted role=admin to ${email} (uid: ${user.uid}).`);
    console.log("  Put these credentials in mehr110-mcp/.env (MEHR110_BOT_EMAIL / MEHR110_BOT_PASSWORD).");
    process.exit(0);
  } catch (e) {
    console.error("✗ Failed:", e.message);
    process.exit(1);
  }
})();
