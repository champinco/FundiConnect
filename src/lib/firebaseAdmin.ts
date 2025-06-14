
import * as admin from 'firebase-admin';
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth, type Auth as AdminAuth } from 'firebase-admin/auth';

let adminApp: admin.app.App | null = null;
let adminDbInstance: AdminFirestore | null = null;
let adminAuthInstance: AdminAuth | null = null;

const projectId = "myfundi-10db8"; 
const databaseURL = `https://myfundi-10db8-default-rtdb.firebaseio.com`;

console.log("\n********************************************************************************");
console.log("***** [FirebaseAdmin] STARTING INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log(`***** Target Project ID: ${projectId} *****`);
console.log(`***** Target Database URL: ${databaseURL} *****`);
console.log("********************************************************************************\n");

if (!admin.apps.length) {
  console.log("[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app...");
  console.log("[FirebaseAdmin] Using: admin.credential.applicationDefault()");
  console.log(`[FirebaseAdmin] With explicit databaseURL: ${databaseURL}`);
  console.log(`[FirebaseAdmin] With explicit projectId: ${projectId}`);
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: databaseURL,
      projectId: projectId, 
    });
    console.log("[FirebaseAdmin] admin.initializeApp(...) called with ADC, databaseURL, and projectId.");

    if (adminApp) {
        console.log(`[FirebaseAdmin] Admin App initialized successfully via automatic discovery. App Name: ${adminApp.name}`);
        
        console.log("[FirebaseAdmin] Attempting to get Firestore instance...");
        try {
            adminDbInstance = getAdminFirestore(adminApp);
            if (adminDbInstance) {
                console.log("[FirebaseAdmin] Firestore Admin instance (adminDb) CREATED successfully.");
                console.log(`[FirebaseAdmin] Type of adminDbInstance (after creation): ${typeof adminDbInstance}, Constructor: ${adminDbInstance.constructor?.name}`);
                if (typeof adminDbInstance.collection !== 'function') {
                    console.error("[FirebaseAdmin] CRITICAL: adminDbInstance (after creation) does NOT have a 'collection' method!");
                } else {
                    console.log("[FirebaseAdmin] adminDbInstance (after creation) appears to have a 'collection' method.");
                }
            } else {
                 console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: getAdminFirestore(adminApp) returned null or undefined even though adminApp was valid. adminDb will be null. !!!!!!!!!!!!!!");
            }
        } catch (firestoreError: any) {
            console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Error calling getAdminFirestore(adminApp) !!!!!!!!!!!!!!");
            console.error("[FirebaseAdmin] Firestore Init Error Code:", firestoreError.code);
            console.error("[FirebaseAdmin] Firestore Init Error Message:", firestoreError.message);
            adminDbInstance = null; 
        }
        
        console.log("[FirebaseAdmin] Attempting to get Auth instance...");
        try {
            adminAuthInstance = getAdminAuth(adminApp);
            if (adminAuthInstance) {
                console.log("[FirebaseAdmin] Auth Admin instance (adminAuth) CREATED successfully.");
            } else {
                console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: getAdminAuth(adminApp) returned null or undefined. adminAuth will be null. !!!!!!!!!!!!!!");
            }
        } catch (authError: any) {
            console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Error calling getAdminAuth(adminApp) !!!!!!!!!!!!!!");
            console.error("[FirebaseAdmin] Auth Init Error Code:", authError.code);
            console.error("[FirebaseAdmin] Auth Init Error Message:", authError.message);
            adminAuthInstance = null; 
        }
        
        console.log("\n[FirebaseAdmin] Firebase Admin SDK (using ADC) appears to have initialized its components.\n");
    } else {
        console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: admin.initializeApp() (using ADC) returned null or undefined !!!!!!!!!!!!!!");
    }

  } catch (error: any) {
    console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() FAILED (using ADC) !!!!!!!!!!!!!!");
    console.error("[FirebaseAdmin] Error Code:", error.code);
    console.error("[FirebaseAdmin] Error Message:", error.message);
    console.error("[FirebaseAdmin] This usually means that Application Default Credentials (ADC) could not be found or are invalid/misconfigured for the target project, or the specified projectId/databaseURL is incorrect.");
    console.error("[FirebaseAdmin] - If running locally: Ensure you've run 'gcloud auth application-default login' and authenticated with a user/service account that has access to the Firebase project '" + projectId + "'.");
    console.error("[FirebaseAdmin] - If running on Google Cloud (e.g., Cloud Run): Ensure the runtime service account has the necessary IAM permissions for Firebase.");
    console.error("[FirebaseAdmin] Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    adminApp = null; 
    adminDbInstance = null;
    adminAuthInstance = null;
  }
} else {
  adminApp = admin.apps[0] as admin.app.App; 
  console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
  if (adminApp) {
    console.log("[FirebaseAdmin] Attempting to get Firestore instance from existing app...");
    try {
        adminDbInstance = getAdminFirestore(adminApp); 
        if (adminDbInstance) {
            console.log("[FirebaseAdmin] Firestore Admin instance (adminDb) RE-ACQUIRED successfully from existing app.");
            console.log(`[FirebaseAdmin] Type of adminDbInstance (after re-acquiring): ${typeof adminDbInstance}, Constructor: ${adminDbInstance.constructor?.name}`);
            if (typeof adminDbInstance.collection !== 'function') {
                console.error("[FirebaseAdmin] CRITICAL: adminDbInstance (after re-acquiring) does NOT have a 'collection' method!");
            } else {
                console.log("[FirebaseAdmin] adminDbInstance (after re-acquiring) appears to have a 'collection' method.");
            }
        } else {
            console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: getAdminFirestore(existingAdminApp) returned null or undefined. adminDb will be null. !!!!!!!!!!!!!!");
        }
    } catch (firestoreError: any) {
        console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Error calling getAdminFirestore(existingAdminApp) !!!!!!!!!!!!!!");
        console.error("[FirebaseAdmin] Firestore Init Error Code:", firestoreError.code);
        console.error("[FirebaseAdmin] Firestore Init Error Message:", firestoreError.message);
        adminDbInstance = null;
    }

    console.log("[FirebaseAdmin] Attempting to get Auth instance from existing app...");
    try {
        adminAuthInstance = getAdminAuth(adminApp); 
        if (adminAuthInstance) {
            console.log("[FirebaseAdmin] Auth Admin instance (adminAuth) RE-ACQUIRED successfully from existing app.");
        } else {
            console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: getAdminAuth(existingAdminApp) returned null or undefined. adminAuth will be null. !!!!!!!!!!!!!!");
        }
    } catch (authError: any) {
        console.error("!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Error calling getAdminAuth(existingAdminApp) !!!!!!!!!!!!!!");
        console.error("[FirebaseAdmin] Auth Init Error Code:", authError.code);
        console.error("[FirebaseAdmin] Auth Init Error Message:", authError.message);
        adminAuthInstance = null;
    }
  } else {
    console.error("[FirebaseAdmin] CRITICAL: Existing admin.apps[0] is null or undefined. This should not happen.");
    adminDbInstance = null;
    adminAuthInstance = null;
  }
}

console.log(`\n[FirebaseAdmin] FINAL STATUS before export: adminDbInstance is ${adminDbInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
if (adminDbInstance) {
    console.log(`[FirebaseAdmin] Type of exported adminDb: ${typeof adminDbInstance}, Constructor: ${adminDbInstance.constructor?.name}`);
    if (typeof adminDbInstance.collection !== 'function') {
        console.error("[FirebaseAdmin] CRITICAL: Exported adminDb does NOT have a 'collection' method!");
    } else {
        console.log("[FirebaseAdmin] Exported adminDb appears to have a 'collection' method.");
    }
}
console.log(`[FirebaseAdmin] FINAL STATUS before export: adminAuthInstance is ${adminAuthInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log("******************************************************************************");
console.log("***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****");
console.log("******************************************************************************\n");

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;

export const AdminTimestamp = admin.firestore.Timestamp; 
export const AdminFieldValue = admin.firestore.FieldValue;

    