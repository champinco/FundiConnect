
/**
 * @fileOverview Service functions for interacting with user data in Firestore.
 */
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase'; // Import auth for current user type
import type { User as FirebaseUser } from 'firebase/auth'; // For Firebase Auth user object
import type { User, AccountType } from '@/models/user';

/**
 * User data structure for creating a document in Firestore.
 * Timestamps are FieldValue. Optional fields from User model are included if provided.
 */
interface UserDocumentForCreate {
  uid: string;
  email: string;
  fullName: string | null;
  accountType: AccountType;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  // These fields are optional in the User model.
  // `userData` (type Omit<User,...>) will have them as optional (e.g. `phoneNumber?: string | null`).
  // The calling action `signupUserAction` currently sets phoneNumber and photoURL to `null`.
  phoneNumber?: string | null;
  photoURL?: string | null;
  providerProfileId?: string;
}

/**
 * Creates or updates a user profile document in Firestore.
 * @param userData - The user data object. Email is now mandatory. Phone number is optional.
 * @param uid - The Firebase Auth UID.
 * @returns A promise that resolves when the operation is complete.
 */
export async function createUserProfileInFirestore(userData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'>, uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const now = serverTimestamp();

    const profileToSave: UserDocumentForCreate = {
      uid: uid,
      email: userData.email,
      fullName: userData.fullName,
      accountType: userData.accountType,
      // userData.phoneNumber is `null` as passed from signupUserAction
      // userData.photoURL is `null` as passed from signupUserAction
      phoneNumber: userData.phoneNumber,
      photoURL: userData.photoURL,
      createdAt: now,
      updatedAt: now,
    };

    // Conditionally add providerProfileId only if it's defined in userData
    // (it will be undefined if accountType is 'client')
    if (userData.providerProfileId !== undefined) {
      profileToSave.providerProfileId = userData.providerProfileId;
    }

    await setDoc(userRef, profileToSave, { merge: true });
  } catch (error) {
    console.error('Error creating user profile in Firestore:', error);
    // The original error from Firestore will be logged above.
    // This custom error message is what gets propagated to the client.
    throw new Error('Could not create user profile.');
  }
}

/**
 * Retrieves a user profile document from Firestore.
 * @param uid - The user's unique ID.
 * @returns A promise that resolves with the User object or null if not found.
 */
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  if (!uid) {
    console.warn('getUserProfileFromFirestore called with undefined or empty UID.');
    // It's better to throw an error here if UID is essential,
    // or ensure calling code handles null robustly if it's a recoverable scenario.
    // For ProfilePage, an invalid UID means we definitely can't fetch a profile.
    // However, returning null is also a valid way to signal not found, which the caller can check.
    return null;
  }
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userDataFromDb = userSnap.data();
      // Convert Firestore Timestamps to Date objects
      return {
        ...userDataFromDb,
        uid: userSnap.id, // ensure uid is from doc id
        createdAt: (userDataFromDb.createdAt as Timestamp)?.toDate(),
        updatedAt: (userDataFromDb.updatedAt as Timestamp)?.toDate(),
      } as User; // Cast to User, assuming structure matches
    } else {
      // This case is handled by ProfilePage by showing "User Data Not Found".
      // This is not an "error" in fetching, but a valid state of data not existing.
      console.warn(`No user profile document found in Firestore for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    // This block is hit if getDoc fails for reasons like permissions, network, etc.
    console.error(`Error fetching user profile from Firestore for UID: ${uid}. Original error:`, error.code, error.message, error);
    // Append the original error message to the thrown error for more client-side context.
    throw new Error(`Could not fetch user profile. Original message: ${error.message}`);
  }
}


/**
 * Creates a default user profile document in Firestore if one doesn't exist.
 * Primarily intended as a fallback for users who completed Auth but missed Firestore profile creation.
 * @param firebaseUser - The Firebase Auth user object.
 * @returns A promise that resolves with the created or existing User object.
 */
export async function createDefaultAppUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const now = Timestamp.now(); // Use Firestore Timestamp for server-side consistency

  const defaultProfileData: Omit<User, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || 'No email provided',
    fullName: firebaseUser.displayName || 'New User',
    accountType: 'client', // Default to client
    photoURL: firebaseUser.photoURL || null,
    phoneNumber: firebaseUser.phoneNumber || null,
    // providerProfileId will be undefined, which is fine for a client
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(userRef, defaultProfileData, { merge: true }); // Use merge to be safe, though set would also work if truly new
    console.log(`Default profile created/updated for UID: ${firebaseUser.uid}`);
    return {
      ...defaultProfileData,
      createdAt: defaultProfileData.createdAt.toDate(), // Convert to JS Date for return consistency
      updatedAt: defaultProfileData.updatedAt.toDate(),
    };
  } catch (error) {
    console.error(`Error creating default user profile for UID ${firebaseUser.uid}:`, error);
    throw new Error('Could not create default user profile.');
  }
}
