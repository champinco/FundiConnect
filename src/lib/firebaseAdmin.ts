
import * as admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';

let adminApp: admin.app.App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Ensure private key newlines are correctly formatted
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log("--- [FirebaseAdmin Start of Initialization Attempt] ---");
console.log(`[FirebaseAdmin] Detected FIREBASE_PROJECT_ID: ${projectId ? `Present (Value: ${projectId.substring(0,5)}...)` : 'MISSING'}`);
console.log(`[FirebaseAdmin] Detected FIREBASE_CLIENT_EMAIL: ${clientEmail ? `Present (Value: ${clientEmail.substring(0,10)}...)` : 'MISSING'}`);
console.log(`[FirebaseAdmin] Detected FIREBASE_PRIVATE_KEY: ${privateKey ? 'Present (Length: ' + privateKey.length + ')' : 'MISSING'}`);


if (projectId && clientEmail && privateKey) {
  if (!admin.apps.length) {
    console.log("[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app...");
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("[FirebaseAdmin] Firebase Admin SDK initialized successfully!");
      adminDbInstance = getFirestore(adminApp);
      adminAuthInstance = getAdminAuth(adminApp);
      if (adminDbInstance) {
        console.log("[FirebaseAdmin] Firestore Admin instance (adminDb) CREATED successfully.");
      } else {
        console.error("[FirebaseAdmin] CRITICAL: getFirestore(adminApp) returned null/undefined AFTER successful initializeApp. This is highly unusual.");
      }
    } catch (error: any) {
      console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initialization FAILED !!!!!!!!!!!!!!");
      console.error("[FirebaseAdmin] Error Code:", error.code);
      console.error("[FirebaseAdmin] Error Message:", error.message);
      // Log the full error object for more details, especially if it's a credential issue
      // Be cautious logging the full error in production if it might contain sensitive details,
      // but for debugging, it's helpful.
      console.error("[FirebaseAdmin] Full Error Object (ensure no sensitive parts are logged in production):", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error("[FirebaseAdmin] Please verify your service account credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) and ensure they are correctly set as environment variables for your server.");
      console.error("[FirebaseAdmin] Also check for any typos in the environment variable names or values, and ensure the private key is complete and correctly formatted (especially newlines).");
      // adminDbInstance and adminAuthInstance will remain null
    }
  } else {
    adminApp = admin.apps[0] as admin.app.App;
    console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
    // Ensure instances are (re)assigned if app already exists from a previous hot-reload or context
    adminDbInstance = getFirestore(adminApp);
    adminAuthInstance = getAdminAuth(adminApp);
    if (adminDbInstance) {
        console.log("[FirebaseAdmin] Firestore Admin instance (adminDb) REUSED successfully.");
    } else {
        console.error("[FirebaseAdmin] CRITICAL: getFirestore(adminApp) returned null/undefined on REUSED app. This is highly unusual.");
    }
  }
} else {
  console.warn(
    "[FirebaseAdmin] WARNING: One or more Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are missing. " +
    "Admin SDK features will NOT be available. This is expected if running client-side OR if server environment variables are not properly set for the server environment."
  );
  console.warn("[FirebaseAdmin] adminDb will be null. This will cause 'Admin DB not initialized' errors if used by server-side code.");
}

console.log(`[FirebaseAdmin] Final check before export: adminDbInstance is ${adminDbInstance ? 'INITIALIZED' : 'NULL'}`);
console.log("--- [FirebaseAdmin End of Initialization Attempt] ---");

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;

// Export Timestamp and FieldValue for use in services
// Check if admin.apps.length > 0 which implies admin has been initialized at least once.
// This prevents errors if admin.firestore is accessed when adminApp is null.
export const AdminTimestamp = admin.apps.length && adminApp ? admin.firestore.Timestamp : undefined;
export const AdminFieldValue = admin.apps.length && adminApp ? admin.firestore.FieldValue : undefined;

    