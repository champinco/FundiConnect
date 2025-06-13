
import * as admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';

let adminApp: admin.app.App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

// ================================================================================================
console.log("********************************************************************************");
console.log("***** [FirebaseAdmin] STARTING INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log("********************************************************************************");

if (projectId && clientEmail && privateKeyInput) {
  console.log("[FirebaseAdmin] CREDENTIALS DETECTED in process.env:");
  console.log(`[FirebaseAdmin]   FIREBASE_PROJECT_ID: '${projectId}' (Type: ${typeof projectId})`);
  console.log(`[FirebaseAdmin]   FIREBASE_CLIENT_EMAIL: '${clientEmail}' (Type: ${typeof clientEmail})`);
  console.log(`[FirebaseAdmin]   FIREBASE_PRIVATE_KEY: ${privateKeyInput ? `Present (Length: ${privateKeyInput.length}, Type: ${typeof privateKeyInput})` : 'MISSING or Empty'}`);

  const privateKey = privateKeyInput.replace(/\\n/g, '\n');
  console.log("[FirebaseAdmin]   Private key after replacing '\\n' with actual newlines.");

  if (!admin.apps.length) {
    console.log("[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app...");
    try {
      const credential = admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      });
      console.log("[FirebaseAdmin] Credential object created successfully using explicit .cert().");

      adminApp = admin.initializeApp({
        credential,
      });
      console.log("[FirebaseAdmin] Firebase Admin SDK initialized successfully! admin.initializeApp() COMPLETED.");

      adminDbInstance = getFirestore(adminApp);
      console.log(`[FirebaseAdmin] getFirestore(adminApp) called. adminDbInstance is now: ${adminDbInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
      
      adminAuthInstance = getAdminAuth(adminApp);
      console.log(`[FirebaseAdmin] getAdminAuth(adminApp) called. adminAuthInstance is now: ${adminAuthInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);

    } catch (error: any) {
      console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() FAILED !!!!!!!!!!!!!!");
      console.error("[FirebaseAdmin] Error Code:", error.code);
      console.error("[FirebaseAdmin] Error Message:", error.message);
      console.error("[FirebaseAdmin] This usually means the Project ID, Client Email, or Private Key from your environment variables are incorrect, malformed, or the service account lacks permissions.");
      console.error("[FirebaseAdmin] Please double-check these values against your downloaded service account JSON file.");
      console.error("[FirebaseAdmin] Full Error Object for debugging:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
  } else {
    adminApp = admin.apps[0] as admin.app.App;
    console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
    adminDbInstance = getFirestore(adminApp); 
    adminAuthInstance = getAdminAuth(adminApp); 
    console.log(`[FirebaseAdmin] Re-assigned adminDbInstance. It is now: ${adminDbInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
    console.log(`[FirebaseAdmin] Re-assigned adminAuthInstance. It is now: ${adminAuthInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
  }
} else {
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("!!! [FirebaseAdmin] WARNING: ONE OR MORE FIREBASE ADMIN CREDENTIALS ARE MISSING !!!");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("[FirebaseAdmin]   Checking process.env.FIREBASE_PROJECT_ID:", projectId === undefined ? "UNDEFINED" : (projectId ? `'${projectId.substring(0,10)}...'` : "EMPTY_STRING"));
  console.log("[FirebaseAdmin]   Checking process.env.FIREBASE_CLIENT_EMAIL:", clientEmail === undefined ? "UNDEFINED" : (clientEmail ? `'${clientEmail.substring(0,10)}...'` : "EMPTY_STRING"));
  console.log("[FirebaseAdmin]   Checking process.env.FIREBASE_PRIVATE_KEY:", privateKeyInput === undefined ? "UNDEFINED" : (privateKeyInput ? `Present (Length: ${privateKeyInput.length})` : "EMPTY_STRING"));
  console.warn("[FirebaseAdmin] Because one or more of these are missing or empty, the Admin SDK cannot be initialized.");
  console.warn("[FirebaseAdmin] Server-side Firebase features will NOT be available. 'adminDb' will be null.");
  console.warn("[FirebaseAdmin] Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are correctly set in your .env file (for local) or hosting environment variables (for deployment).");
}

console.log(`[FirebaseAdmin] FINAL STATUS before export: adminDbInstance is ${adminDbInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log("******************************************************************************");
console.log("***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log("******************************************************************************");

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;

export const AdminTimestamp = admin.apps.length && adminApp ? admin.firestore.Timestamp : undefined;
export const AdminFieldValue = admin.apps.length && adminApp ? admin.firestore.FieldValue : undefined;
