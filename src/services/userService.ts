
/**
 * @fileOverview Service functions for interacting with user data in Firestore.
 */
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    throw new Error('Could not fetch user profile.');
  }
}

