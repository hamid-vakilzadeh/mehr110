#!/usr/bin/env node
/* ============================================================
   Bootstrap the FIRST admin (manager) for صندوق مهر۱۱۰.

   Grants the custom claim { role: "admin" } to a user by email.
   Run this ONCE locally after creating the manager's account in
   Firebase Auth. Subsequent admins can be added via the
   `setAdminRole` callable (which itself requires an admin).

   Credentials (NEVER commit these — they are git-ignored):
     export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
   …or use application-default credentials:
     gcloud auth application-default login

   Usage:
     node functions/scripts/setAdmin.js manager@example.com
     # against the emulator:
     FIRESTORE_EMULATOR_HOST=localhost:8080 \
     FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
     node functions/scripts/setAdmin.js manager@example.com
   ============================================================ */
const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node functions/scripts/setAdmin.js <email>");
  process.exit(1);
}

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || undefined,
});

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    console.log(`✓ Granted role=admin to ${email} (uid: ${user.uid}).`);
    console.log("  The user must sign out and back in for the claim to take effect.");
    process.exit(0);
  } catch (e) {
    console.error("✗ Failed:", e.message);
    process.exit(1);
  }
})();
