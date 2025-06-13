
import * as admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';

let adminApp: admin.app.App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

const REALTIME_DATABASE_URL = 'https://myfundi-10db8-default-rtdb.firebaseio.com';

// Enhanced logging to clearly show initialization status and method
console.log("\n********************************************************************************");
console.log("***** [FirebaseAdmin] STARTING INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log(`***** Using Application Default Credentials (ADC) method.                *****`);
console.log(`***** Realtime Database URL specified: ${REALTIME_DATABASE_URL}        *****`);
console.log("********************************************************************************\n");

if (!admin.apps.length) {
  console.log("[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app using Application Default Credentials...");
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: REALTIME_DATABASE_URL 
    });
    console.log("[FirebaseAdmin] Firebase Admin SDK initializeApp() called with applicationDefault() and databaseURL.");

    if (adminApp) {
        console.log(`[FirebaseAdmin] Admin App initialized successfully. App Name: ${adminApp.name}`);
        adminDbInstance = getFirestore(adminApp);
        console.log(`[FirebaseAdmin] getFirestore(adminApp) called. adminDbInstance is now: ${adminDbInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
        
        adminAuthInstance = getAdminAuth(adminApp);
        console.log(`[FirebaseAdmin] getAdminAuth(adminApp) called. adminAuthInstance is now: ${adminAuthInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
        
        console.log("\n[FirebaseAdmin] Firebase Admin SDK (using ADC) appears to have initialized successfully!\n");
    } else {
        console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: admin.initializeApp() returned null or undefined (using ADC) !!!!!!!!!!!!!!");
    }

  } catch (error: any) {
    console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() FAILED (using ADC) !!!!!!!!!!!!!!");
    console.error("[FirebaseAdmin] Error Code:", error.code);
    console.error("[FirebaseAdmin] Error Message:", error.message);
    console.error("[FirebaseAdmin] This usually means that Application Default Credentials could not be found or are invalid.");
    console.error("[FirebaseAdmin] - If running locally: Ensure you've run 'gcloud auth application-default login' and are authenticated with a user/service account that has access to the Firebase project.");
    console.error("[FirebaseAdmin] - If running on Google Cloud (e.g., Cloud Run, GCE, GKE, App Engine): Ensure the runtime service account has the necessary IAM permissions for Firebase (e.g., Firebase Admin SDK Administrator Service Agent, or roles for Firestore/Auth).");
    console.error("[FirebaseAdmin] - If using GOOGLE_APPLICATION_CREDENTIALS env var: Ensure it points to a valid service account JSON key file and the file is accessible.");
    console.error("[FirebaseAdmin] Full Error Object for debugging:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
} else {
  adminApp = admin.apps[0] as admin.app.App; // Type assertion
  console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
  if (adminApp) {
    adminDbInstance = getFirestore(adminApp); 
    adminAuthInstance = getAdminAuth(adminApp); 
    console.log(`[FirebaseAdmin] Re-assigned adminDbInstance. It is now: ${adminDbInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
    console.log(`[FirebaseAdmin] Re-assigned adminAuthInstance. It is now: ${adminAuthInstance ? 'INITIALIZED' : 'STILL NULL (UNEXPECTED!)'}`);
  } else {
    console.error("[FirebaseAdmin] CRITICAL: Existing admin.apps[0] is null or undefined. This should not happen.");
  }
}

console.log(`\n[FirebaseAdmin] FINAL STATUS before export: adminDbInstance is ${adminDbInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log("******************************************************************************");
console.log("***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log("******************************************************************************\n");

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;

// Check if adminApp was successfully initialized before trying to access firestore.Timestamp or firestore.FieldValue
export const AdminTimestamp = adminApp ? admin.firestore.Timestamp : undefined;
export const AdminFieldValue = adminApp ? admin.firestore.FieldValue : undefined;
    