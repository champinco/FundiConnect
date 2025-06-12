
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
// IMPORTANT: In production, be cautious about logging sensitive details.
// Here, we only log whether they are present or not.
console.log("[FirebaseAdmin] Initializing Firebase Admin SDK...");
console.log(`[FirebaseAdmin] FIREBASE_PROJECT_ID detected: ${!!projectId}`);
console.log(`[FirebaseAdmin] FIREBASE_CLIENT_EMAIL detected: ${!!clientEmail}`);
console.log(`[FirebaseAdmin] FIREBASE_PRIVATE_KEY detected: ${!!privateKey}`);

if (projectId && clientEmail && privateKey) {
  if (!admin.apps.length) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("[FirebaseAdmin] Firebase Admin SDK initialized successfully using process.env variables.");
      adminDbInstance = getFirestore(adminApp);
      adminAuthInstance = getAdminAuth(adminApp);
    } catch (error: any) {
      console.error("[FirebaseAdmin] Firebase Admin SDK initialization error:", error.message);
      console.error("[FirebaseAdmin] Ensure service account details (project ID, client email, private key) are correct and the private key format is valid (newlines handled).");
      // adminDb and adminAuth will remain null
    }
  } else {
    adminApp = admin.apps[0] as admin.app.App; // Get the default app if already initialized
    console.log("[FirebaseAdmin] Firebase Admin SDK already initialized. Reusing existing app.");
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
export const AdminTimestamp = admin.firestore.Timestamp;
export const AdminFieldValue = admin.firestore.FieldValue;
