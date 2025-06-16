
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
    
    let appCredential;
    const appOptions: AppOptions = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'myfundi-10db8',
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://myfundi-10db8-default-rtdb.firebaseio.com',
    };

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('[FirebaseAdmin] Using service account key from FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
      try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const potentiallyFixedKey = serviceAccountString.replace(/\\\\n/g, '\\n');
        const serviceAccount = JSON.parse(potentiallyFixedKey);
        appCredential = cert(serviceAccount);
        appOptions.credential = appCredential;
        console.log('[FirebaseAdmin] Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY.');
      } catch (e: any) {
        console.error('[FirebaseAdmin] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string and private_key newlines are escaped (e.g., \\\\n for \\n). Error:', e.message);
        console.log('[FirebaseAdmin] Warning: FIREBASE_SERVICE_ACCOUNT_KEY was set but could not be parsed. Attempting next credential method.');
        appCredential = undefined; 
      }
    }

    if (!appOptions.credential) {
      console.log('[FirebaseAdmin] Trying service account file firebase-service-account.json...');
      try {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(serviceAccountContent);
            appCredential = cert(serviceAccount);
            appOptions.credential = appCredential;
            console.log('[FirebaseAdmin] Using service account file:', serviceAccountPath);
        } else {
            console.log('[FirebaseAdmin] Default service account file (firebase-service-account.json) not found in project root.');
            appCredential = undefined;
        }
      } catch (fileError: any) {
        console.log('[FirebaseAdmin] Error trying to load default service account file:', fileError.message);
        appCredential = undefined;
      }
    }

    if (!appOptions.credential) {
      console.log('[FirebaseAdmin] No specific service account key loaded (env var or file). Attempting Application Default Credentials.');
    }
    
    adminApp = initializeApp(appOptions);
    console.log('[FirebaseAdmin] Admin App initialized successfully. App Name:', adminApp.name);
  } else {
    adminApp = existingApps[0]; 
    console.log('[FirebaseAdmin] Using existing Firebase admin app:', adminApp.name);
  }
  
  if (adminApp) {
    console.log('[FirebaseAdmin] Attempting to get Firestore instance for app:', adminApp.name);
    adminDbInstance = getFirestore(adminApp);
    if (adminDbInstance && typeof adminDbInstance.collection === 'function') {
        console.log('[FirebaseAdmin] Firestore Admin instance (adminDb) CREATED successfully.');
    } else {
        console.error('[FirebaseAdmin] CRITICAL: Firestore Admin instance (adminDb) FAILED to be created or is invalid.');
        adminDbInstance = null; 
    }
    
    console.log('[FirebaseAdmin] Attempting to get Auth instance for app:', adminApp.name);
    adminAuthInstance = getAuth(adminApp); 
    if (adminAuthInstance && typeof adminAuthInstance.getUser === 'function') {
        console.log('[FirebaseAdmin] Auth Admin instance (adminAuth) CREATED successfully.');
    } else {
        console.error('[FirebaseAdmin] CRITICAL: Auth Admin instance (adminAuth) FAILED to be created or is invalid.');
        adminAuthInstance = null;
    }
    
    console.log('\n[FirebaseAdmin] Firebase Admin SDK initialization attempt completed.');
  } else {
    throw new Error("[FirebaseAdmin] CRITICAL: Admin App could not be obtained or initialized.");
  }
  
} catch (error: any) {
  console.log('!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() or service retrieval FAILED !!!!!!!!!!!!!!');
  console.log('[FirebaseAdmin] Error Code:', error?.code || 'undefined');
  console.log('[FirebaseAdmin] Error Message:', error?.message || 'No error message');
  console.error('[FirebaseAdmin] Full Error Object:', error); 
  
  adminDbInstance = null; 
  adminAuthInstance = null;
}

console.log('\n[FirebaseAdmin] FINAL STATUS before export:');
console.log(`[FirebaseAdmin] adminDbInstance is ${adminDbInstance && typeof adminDbInstance.collection === 'function' ? 'INITIALIZED and USABLE' : '<<<<< NULL or INVALID >>>>>'}`);
console.log(`[FirebaseAdmin] adminAuthInstance is ${adminAuthInstance && typeof adminAuthInstance.getUser === 'function' ? 'INITIALIZED and USABLE' : '<<<<< NULL or INVALID >>>>>'}`);
console.log('******************************************************************************');
console.log('***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****');
console.log('******************************************************************************');

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
