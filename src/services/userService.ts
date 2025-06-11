
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
 * Helper function to safely convert Firestore Timestamps or other date representations to JavaScript Date objects.
 * @param fieldValue - The field value which might be a Firestore Timestamp, JS Date, string, or number.
 * @returns A JavaScript Date object.
 */
const convertPotentialTimestampToDate = (fieldValue: any): Date => {
  // Check if it's a Firestore Timestamp
  if (fieldValue && typeof fieldValue.toDate === 'function') {
    return (fieldValue as Timestamp).toDate();
  }
  // Check if it's already a JavaScript Date
  if (fieldValue instanceof Date) {
    return fieldValue;
  }
  // If it's a string or number, try to parse it
  // This handles ISO strings or millisecond numbers from epoch
  if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
    const parsedDate = new Date(fieldValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  // Fallback for unrecognized format or missing mandatory field
  // Your User model expects createdAt/updatedAt to be non-nullable Date.
  // If fieldValue is null/undefined or unparseable here, it indicates a data issue.
  console.warn(`Invalid or missing timestamp field encountered: ${JSON.stringify(fieldValue)}. Defaulting to current date. This may indicate a data integrity issue.`);
  return new Date(); // Return current date as a fallback to prevent crashes
};


/**
 * Retrieves a user profile document from Firestore.
 * @param uid - The user's unique ID.
 * @returns A promise that resolves with the User object or null if not found.
 */
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  if (!uid) {
    console.warn('getUserProfileFromFirestore called with undefined or empty UID.');
    return null;
  }
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userDataFromDb = userSnap.data();
      // Convert Firestore Timestamps to Date objects safely
      return {
        ...userDataFromDb,
        uid: userSnap.id, // ensure uid is from doc id
        createdAt: convertPotentialTimestampToDate(userDataFromDb.createdAt),
        updatedAt: convertPotentialTimestampToDate(userDataFromDb.updatedAt),
      } as User; // Cast to User, assuming structure matches
    } else {
      console.warn(`No user profile document found in Firestore for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error fetching user profile from Firestore for UID: ${uid}. Original error:`, error.code, error.message, error);
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
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Check if profile already exists to avoid overwriting if called concurrently or multiple times
    const existingProfileSnap = await getDoc(userRef);
    if (existingProfileSnap.exists()) {
        console.log(`Profile already exists for UID: ${firebaseUser.uid}. Returning existing profile.`);
        const existingData = existingProfileSnap.data();
        return {
            ...existingData,
            uid: existingProfileSnap.id,
            createdAt: convertPotentialTimestampToDate(existingData.createdAt),
            updatedAt: convertPotentialTimestampToDate(existingData.updatedAt),
        } as User;
    }

    await setDoc(userRef, defaultProfileData);
    console.log(`Default profile created for UID: ${firebaseUser.uid}`);
    return {
      ...defaultProfileData,
      createdAt: defaultProfileData.createdAt.toDate(), // Convert to JS Date for return consistency
      updatedAt: defaultProfileData.updatedAt.toDate(),
    };
  } catch (error) {
    console.error(`Error creating or checking default user profile for UID ${firebaseUser.uid}:`, error);
    throw new Error('Could not create or check default user profile.');
  }
}

