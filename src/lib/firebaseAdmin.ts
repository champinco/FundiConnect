
import * as admin from 'firebase-admin';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

let adminApp: App;

// Ensure environment variables are defined
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      "Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not fully set. " +
      "Admin SDK features will not be available. This is okay for client-side only development but required for server-side actions."
    );
  } else {
    // In production, throw an error if not configured, as server actions would fail.
    // However, for a more graceful approach, you might want to conditionally disable features.
    // For now, we'll let it proceed and calls to adminDb will fail if not initialized.
    console.error(
      "CRITICAL: Firebase Admin SDK environment variables are not set in production environment. " +
      "Server-side Firestore operations will fail."
    );
  }
}

if (projectId && clientEmail && privateKey && !getApps().length) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Replace escaped newlines
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message, error.stack);
    // Depending on your app's needs, you might throw here or handle it.
    // If admin features are critical, throwing might be appropriate.
  }
} else if (getApps().length > 0) {
  adminApp = getApp();
} else {
  // @ts-ignore
  adminApp = null; // Explicitly set to null if not initialized
  if (process.env.NODE_ENV === 'development') {
    console.log("Firebase Admin SDK not initialized due to missing env vars or existing app instance handling.");
  }
}

// Conditionally export adminDb and adminAuth only if adminApp was initialized
const adminDb = adminApp! ? getFirestore(adminApp) : null!;
const adminAuth = adminApp! ? getAdminAuth(adminApp) : null!;


// Export Timestamp and FieldValue for use in services
// These can be accessed via admin.firestore.Timestamp etc., but exporting them directly can be convenient
const AdminTimestamp = admin.firestore.Timestamp;
const AdminFieldValue = admin.firestore.FieldValue;


export { adminDb, adminAuth, AdminTimestamp, AdminFieldValue };
