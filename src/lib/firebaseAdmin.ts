import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
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
  // Check if Firebase Admin is already initialized
  const existingApps = getApps();
  console.log(`[FirebaseAdmin] Existing apps count: ${existingApps.length}`);
  
  if (existingApps.length === 0) {
    console.log('[FirebaseAdmin] No existing Firebase admin apps. Attempting to initialize a new app...');
    
    let credential;
    
    // Method 1: Try to use service account key file
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[FirebaseAdmin] Using service account key file from GOOGLE_APPLICATION_CREDENTIALS');
      const serviceAccountPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log(`[FirebaseAdmin] Service account file found at: ${serviceAccountPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = cert(serviceAccount);
      } else {
        console.log(`[FirebaseAdmin] Service account file not found at: ${serviceAccountPath}`);
        // Do not throw error here, allow fallback to next method
        console.warn(`[FirebaseAdmin] Warning: GOOGLE_APPLICATION_CREDENTIALS was set but file not found at ${serviceAccountPath}. Attempting next credential method.`);
      }
    }
    
    // Method 2: Try to use service account key from environment variable (if Method 1 failed or wasn't tried)
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('[FirebaseAdmin] Using service account key from FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(serviceAccount);
      } catch (e) {
        console.error('[FirebaseAdmin] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is a valid JSON string.', e);
        // Do not throw error here, allow fallback to next method if parsing failed
        console.warn('[FirebaseAdmin] Warning: FIREBASE_SERVICE_ACCOUNT_KEY was set but could not be parsed. Attempting next credential method.');
      }
    }
    
    // Method 3: Try Application Default Credentials (fallback if no specific credential was loaded)
    if (!credential) {
      console.log('[FirebaseAdmin] No specific service account key found (file or env var), trying Application Default Credentials');
      // Don't set credential, let Firebase use ADC by not providing it in initConfig if it's undefined
    }
    
    const initConfig: any = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'myfundi-10db8',
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://myfundi-10db8-default-rtdb.firebaseio.com'
    };
    
    if (credential) {
      initConfig.credential = credential;
      console.log('[FirebaseAdmin] Initializing with explicitly loaded service account credential.');
    } else {
      console.log('[FirebaseAdmin] Initializing with Application Default Credentials (no explicit credential loaded).');
    }
    
    // Initialize the Firebase Admin app
    adminApp = initializeApp(initConfig);
    console.log('[FirebaseAdmin] Admin App initialized successfully. App Name:', adminApp.name);
  } else {
    console.log('[FirebaseAdmin] Using existing Firebase admin app.');
    adminApp = existingApps[0];
  }
  
  // Initialize Firestore
  console.log('[FirebaseAdmin] Attempting to get Firestore instance...');
  adminDbInstance = getFirestore(adminApp);
  console.log('[FirebaseAdmin] Firestore Admin instance (adminDb) CREATED successfully.');
  
  // Initialize Auth
  console.log('[FirebaseAdmin] Attempting to get Auth instance...');
  adminAuthInstance = getAuth(adminApp);
  console.log('[FirebaseAdmin] Auth Admin instance (adminAuth) CREATED successfully.');
  
  console.log('\n[FirebaseAdmin] Firebase Admin SDK initialized successfully!');
  
} catch (error) {
  console.log('!!!!!!!!!!!!!! [FirebaseAdmin] CRITICAL: Firebase Admin SDK initializeApp() FAILED !!!!!!!!!!!!!!');
  console.log('[FirebaseAdmin] Error Code:', (error as any)?.code || 'undefined');
  console.log('[FirebaseAdmin] Error Message:', (error as any)?.message || 'No error message');
  console.log('[FirebaseAdmin] This usually means:');
  console.log('[FirebaseAdmin] 1. Service account key file (if GOOGLE_APPLICATION_CREDENTIALS used) is missing or invalid.');
  console.log('[FirebaseAdmin] 2. FIREBASE_SERVICE_ACCOUNT_KEY (if used) is not a valid JSON string or the key itself is invalid.');
  console.log('[FirebaseAdmin] 3. Application Default Credentials (if fallback used) are not set up or lack permissions.');
  console.log('[FirebaseAdmin] 4. Firebase project ID or database URL might be incorrect if not discoverable.');
  console.log('[FirebaseAdmin] 5. Service account (from key or ADC) lacks necessary IAM permissions.');
  console.log('[FirebaseAdmin] Full Error Object:', JSON.stringify({
    stack: (error as any)?.stack,
    message: (error as any)?.message,
    code: (error as any)?.code
  }, null, 2));
  
  // Set instances to null on failure
  adminDbInstance = null;
  adminAuthInstance = null;
}

// Log final status
console.log('\n[FirebaseAdmin] FINAL STATUS before export:');
console.log(`[FirebaseAdmin] adminDbInstance is ${adminDbInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log(`[FirebaseAdmin] adminAuthInstance is ${adminAuthInstance ? 'INITIALIZED and USABLE' : '<<<<< NULL and UNUSABLE >>>>>'}`);
console.log('******************************************************************************');
console.log('***** [FirebaseAdmin] END OF INITIALIZATION ATTEMPT (firebaseAdmin.ts) *****');
console.log('******************************************************************************');

// Export the instances
export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
// adminApp is not typically exported directly unless needed by other parts of the app
// If you need to export it, you can use:
// export const adminAppInstance = adminApp;
