
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
      phoneNumber: userData.phoneNumber,
      photoURL: userData.photoURL,
      createdAt: now,
      updatedAt: now,
    };

    if (userData.providerProfileId !== undefined) {
      profileToSave.providerProfileId = userData.providerProfileId;
    }

    await setDoc(userRef, profileToSave, { merge: true });
  } catch (error) {
    console.error('Error creating user profile in Firestore:', error);
    throw new Error('Could not create user profile.');
  }
}

/**
 * Helper function to safely convert Firestore Timestamps or other date representations to JavaScript Date objects.
 * @param fieldValue - The field value which might be a Firestore Timestamp, JS Date, string, or number.
 * @returns A JavaScript Date object.
 */
const convertPotentialTimestampToDate = (fieldValue: any): Date => {
  if (fieldValue && typeof fieldValue.toDate === 'function') {
    return (fieldValue as Timestamp).toDate();
  }
  if (fieldValue instanceof Date) {
    return fieldValue;
  }
  if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
    try {
      const parsedDate = new Date(fieldValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      // Ignore parsing errors for strings/numbers if new Date() throws (e.g. invalid date string format)
    }
  }
  console.warn(`Invalid or missing timestamp field encountered. Value: ${String(fieldValue)}. Defaulting to current date. This may indicate a data integrity issue.`);
  return new Date(); 
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
      const data = userSnap.data();
      
      // Explicitly map fields to avoid issues with spread operator and ensure type safety
      // Also provide defaults for potentially missing fields to align with the User model.
      const userProfile: User = {
        uid: userSnap.id,
        email: data.email || '', 
        fullName: data.fullName || null,
        accountType: data.accountType || 'client', 
        photoURL: data.photoURL || null,
        phoneNumber: data.phoneNumber || null,
        providerProfileId: data.providerProfileId || undefined,
        
        createdAt: convertPotentialTimestampToDate(data.createdAt),
        updatedAt: convertPotentialTimestampToDate(data.updatedAt),
      };
      
      // Remove providerProfileId if it was not present, to match User model precisely
      if (userProfile.providerProfileId === undefined) {
        delete userProfile.providerProfileId;
      }

      return userProfile;

    } else {
      console.warn(`No user profile document found in Firestore for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    // Log the full original error for better debugging
    console.error(`Error in getUserProfileFromFirestore for UID: ${uid}.`);
    console.error("Original Error Object:", error); 
    console.error("Original Error Message:", error.message);
    console.error("Original Error Stack:", error.stack);
    
    let errorMessage = "Could not fetch user profile.";
    if (error && error.message) {
      // Append the original error message to the new error we throw.
      errorMessage += ` Original issue: ${error.message}`;
    }
    throw new Error(errorMessage);
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
  
  // Use Firestore Timestamp for server-side consistency when creating new docs
  const nowAsFirestoreTimestamp = Timestamp.now(); 

  const defaultProfileData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || 'No email provided',
    fullName: firebaseUser.displayName || 'New User',
    accountType: 'client' as AccountType, 
    photoURL: firebaseUser.photoURL || null,
    phoneNumber: firebaseUser.phoneNumber || null,
    createdAt: nowAsFirestoreTimestamp, // Store as Firestore Timestamp
    updatedAt: nowAsFirestoreTimestamp, // Store as Firestore Timestamp
  };

  try {
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
    } as User; // Cast because providerProfileId is missing, which is fine for client type
  } catch (error) {
    console.error(`Error creating or checking default user profile for UID ${firebaseUser.uid}:`, error);
    throw new Error('Could not create or check default user profile.');
  }
}
