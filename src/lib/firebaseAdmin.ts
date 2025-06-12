
import * as admin from 'firebase-admin';
import { getFirestore, type Firestore } from 'firebase-admin/firestore'; // Modular import for getFirestore
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth'; // Modular import for getAuth

let adminApp: admin.app.App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Log the presence of environment variables for debugging
console.log("[FirebaseAdmin] Attempting to initialize Firebase Admin SDK...");
console.log(`[FirebaseAdmin] FIREBASE_PROJECT_ID detected: ${!!projectId}`);
console.log(`[FirebaseAdmin] FIREBASE_CLIENT_EMAIL detected: ${!!clientEmail}`);
// For private key, just confirm its presence without logging its content for security
console.log(`[FirebaseAdmin] FIREBASE_PRIVATE_KEY detected: ${!!privateKey ? 'Yes' : 'No'}`);


if (projectId && clientEmail && privateKey) {
  if (!admin.apps.length) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Ensure private key newlines are correctly formatted
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("[FirebaseAdmin] Firebase Admin SDK initialized successfully using process.env variables.");
      adminDbInstance = getFirestore(adminApp);
      adminAuthInstance = getAdminAuth(adminApp);
    } catch (error: any) {
      console.error("[FirebaseAdmin] Firebase Admin SDK initialization error:", error.message);
      // Log the full error object for more details, especially if it's a credential issue
      console.error("[FirebaseAdmin] Full error details:", error);
      console.error("[FirebaseAdmin] Ensure service account details (project ID, client email, private key) are correct and the private key format is valid (newlines handled).");
      // adminDb and adminAuth will remain null
    }
  } else {
    adminApp = admin.apps[0] as admin.app.App; // Get the default app if already initialized
    console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
    // Ensure instances are (re)assigned if app already exists from a previous hot-reload or context
    adminDbInstance = getFirestore(adminApp);
    adminAuthInstance = getAdminAuth(adminApp);
  }
} else {
  console.warn(
    "[FirebaseAdmin] One or more Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are missing. " +
    "Admin SDK features will not be available. This is expected if running client-side or if server environment variables are not set."
  );
}

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;

// Export Timestamp and FieldValue for use in services
// Check if admin.apps.length > 0 which implies admin has been initialized at least once.
// This prevents errors if admin.firestore is accessed when adminApp is null.
export const AdminTimestamp = admin.apps.length && adminApp ? admin.firestore.Timestamp : undefined;
export const AdminFieldValue = admin.apps.length && adminApp ? admin.firestore.FieldValue : undefined;
