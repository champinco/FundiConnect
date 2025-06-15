
import { initializeApp, getApps, cert, App, type AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

console.log('********************************************************************************');
console.log('***** [FirebaseAdmin] STARTING INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****');
console.log(`***** Target Project ID: ${process.env.FIREBASE_PROJECT_ID || 'myfundi-10db8'} *****`);
console.log(`***** Target Database URL: ${process.env.FIREBASE_DATABASE_URL || 'https://myfundi-10db8-default-rtdb.firebaseio.com'} *****`);
console.log('********************************************************************************');

let adminApp: App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

try {
  const existingApps = getApps();
  console.log(`[FirebaseAdmin] Existing apps count: ${existingApps.length}`);

  if (existingApps.length === 0) {
    console.log('[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app...');
    
    let credential;
    const appOptions: AppOptions = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'myfundi-10db8',
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://myfundi-10db8-default-rtdb.firebaseio.com',
    };

    // Method 1: Try to use service account key from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('[FirebaseAdmin] Using service account key from FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
      try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        // Ensure the string is parsed correctly, especially escaped newlines.
        const serviceAccount = JSON.parse(serviceAccountString);
        credential = cert(serviceAccount);
        appOptions.credential = credential;
        console.log('[FirebaseAdmin] Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY.');
      } catch (e: any) {
        console.error('[FirebaseAdmin] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string and private_key newlines are escaped (\\\\n). Error:', e.message);
        console.log('[FirebaseAdmin] Warning: FIREBASE_SERVICE_ACCOUNT_KEY was set but could not be parsed. Attempting next credential method.');
        credential = undefined; // Reset credential if parsing failed
      }
    }

    // Method 2: Try to use service account key file (if env var failed or wasn't set)
    if (!appOptions.credential) {
      console.log('[FirebaseAdmin] Trying service account file firebase-service-account.json...');
      try {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(serviceAccountContent);
            credential = cert(serviceAccount);
            appOptions.credential = credential;
            console.log('[FirebaseAdmin] Using service account file:', serviceAccountPath);
        } else {
            console.log('[FirebaseAdmin] Default service account file (firebase-service-account.json) not found in project root.');
            credential = undefined;
        }
      } catch (fileError: any) {
        console.log('[FirebaseAdmin] Error trying to load default service account file:', fileError.message);
        credential = undefined;
      }
    }


    // Method 3: Fallback to Application Default Credentials if no specific credential was loaded successfully
    if (!appOptions.credential) {
      console.log('[FirebaseAdmin] No specific service account key loaded (env var or file). Attempting Application Default Credentials.');
      // For ADC, credential should remain undefined in appOptions.
    }
    
    adminApp = initializeApp(appOptions);
    console.log('[FirebaseAdmin] Admin App initialized successfully. App Name:', adminApp.name);
  } else {
    adminApp = existingApps[0];
    console.log('[FirebaseAdmin] Using existing Firebase admin app:', adminApp.name);
  }
  
  if (adminApp) {
    console.log('[FirebaseAdmin] Attempting to get Firestore instance...');
    adminDbInstance = getFirestore(adminApp);
    console.log('[FirebaseAdmin] Firestore Admin instance (adminDb) CREATED successfully.');
    
    console.log('[FirebaseAdmin] Attempting to get Auth instance...');
    adminAuthInstance = getAuth(adminApp);
    console.log('[FirebaseAdmin] Auth Admin instance (adminAuth) CREATED successfully.');
    
    console.log('\n[FirebaseAdmin] Firebase Admin SDK initialized successfully!');
  } else {
    throw new Error("[FirebaseAdmin] CRITICAL: Admin App could not be obtained or initialized.");
  }
  
} catch (error) {
  console.log('!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() or service retrieval FAILED !!!!!!!!!!!!!!');
  console.log('[FirebaseAdmin] Error Code:', (error as any)?.code || 'undefined');
  console.log('[FirebaseAdmin] Error Message:', (error as any)?.message || 'No error message');
  console.log('[FirebaseAdmin] This usually means:');
  console.log('[FirebaseAdmin] 1. Service account key (from env var or file) is missing, malformed, or invalid.');
  console.log('[FirebaseAdmin] 2. Application Default Credentials (if fallback used) are not set up or lack permissions.');
  console.log('[FirebaseAdmin] 3. Firebase project ID or database URL might be incorrect if not discoverable.');
  console.log('[FirebaseAdmin] 4. Service account (from key or ADC) lacks necessary IAM permissions.');
  console.log('[FirebaseAdmin] Full Error Object:', JSON.stringify({
    stack: (error as any)?.stack,
    message: (error as any)?.message,
    code: (error as any)?.code
  }, null, 2));
  
  adminDbInstance = null;
  adminAuthInstance = null;
}

console.log('\n[FirebaseAdmin] FINAL STATUS before export:');
console.log(`[FirebaseAdmin] adminDbInstance is ${adminDbInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log(`[FirebaseAdmin] adminAuthInstance is ${adminAuthInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log('******************************************************************************');
console.log('***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****');
console.log('******************************************************************************');

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
