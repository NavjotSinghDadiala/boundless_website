/**
 * BOUNDLESS SOCIETY — PRODUCTION-GRADE FIRESTORE BACKUP UTILITY
 * 
 * Invariants:
 * 1. ZERO HASHING: Uses natural keys, document IDs, and clean structured JSON.
 * 2. Non-destructive: Read-only scan of critical collections.
 * 3. Exports full document data with metadata manifest.
 * 4. Safe for offline or secondary Cloud Storage archival.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = getFirestore();

const CRITICAL_COLLECTIONS = [
  "trips",
  "tripRegistrations",
  "user-registrations",
  "students",
  "user_profiles",
  "adminUsers",
  "adminAuditLogs",
  "coordinators",
  "googleForms",
];

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve("./backups", `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[Backup] Starting backup run at: ${new Date().toISOString()}`);
  console.log(`[Backup] Output directory: ${backupDir}`);

  const manifest = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    collections: {},
    totalDocuments: 0,
    status: "in_progress",
  };

  for (const colName of CRITICAL_COLLECTIONS) {
    try {
      console.log(`  -> Exporting collection: ${colName}...`);
      const snap = await adminDb.collection(colName).get();
      const docsData = [];

      for (const doc of snap.docs) {
        docsData.push({
          _id: doc.id,
          ...doc.data(),
        });
      }

      const filePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docsData, null, 2), "utf8");

      manifest.collections[colName] = {
        documentCount: docsData.length,
        fileSizeInBytes: fs.statSync(filePath).size,
      };
      manifest.totalDocuments += docsData.length;
      console.log(`     ✅ Saved ${docsData.length} records (${(manifest.collections[colName].fileSizeInBytes / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`     ❌ Failed to export ${colName}:`, err.message);
      manifest.collections[colName] = {
        error: err.message,
        documentCount: 0,
      };
    }
  }

  manifest.status = "completed";
  manifest.completedAt = new Date().toISOString();

  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\n[Backup] Finished successfully! Total documents backed up: ${manifest.totalDocuments}`);
  console.log(`[Backup] Manifest written to: ${path.join(backupDir, "manifest.json")}`);
  return { backupDir, manifest };
}

runBackup().catch((err) => {
  console.error("[Backup] Fatal error:", err);
  process.exit(1);
});
