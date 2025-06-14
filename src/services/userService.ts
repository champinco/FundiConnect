
/**
 * @fileOverview Service functions for interacting with user data in Firestore.
 */
import { type UpdateData } from 'firebase/firestore'; // Keep for UpdateData type if needed, but operations change
import { adminDb, AdminTimestamp, AdminFieldValue } from '@/lib/firebaseAdmin'; // Use Admin SDK
import type { User as FirebaseUser } from 'firebase/auth'; // Client-side Firebase User type
import type { User, AccountType } from '@/models/user';


interface UserDocumentForCreate {
  uid: string;
  email: string;
  fullName: string | null;
  accountType: AccountType;
  createdAt: admin.firestore.FieldValue; // For Admin SDK
  updatedAt: admin.firestore.FieldValue; // For Admin SDK
  phoneNumber?: string | null;
  photoURL?: string | null;
  providerProfileId?: string;
}

/**
 * Creates or updates a user profile document in Firestore using Admin SDK.
 * @param userData - The user data object.
 * @param uid - The Firebase Auth UID.
 * @returns A promise that resolves when the operation is complete.
 */
export async function createUserProfileInFirestore(userData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'>, uid: string): Promise<void> {
  if (!adminDb) {
    console.error("Admin DB not initialized. User profile creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const now = AdminFieldValue.serverTimestamp();

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

    await userRef.set(profileToSave, { merge: true });
  } catch (error) {
    console.error('Error creating user profile in Firestore (Admin SDK):', error);
    throw new Error('Could not create user profile.');
  }
}


const convertPotentialAdminTimestampToDate = (fieldValue: any): Date => {
  if (fieldValue && fieldValue instanceof AdminTimestamp) { // Check for AdminTimestamp
    return fieldValue.toDate();
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
      // Ignore
    }
  }
  console.warn(`Invalid or missing admin timestamp field. Value: ${String(fieldValue)}. Defaulting to current date.`);
  return new Date();
};


/**
 * Retrieves a user profile document from Firestore using Admin SDK.
 * @param uid - The user's unique ID.
 * @returns A promise that resolves with the User object or null if not found.
 */
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch user profile.");
    return null;
  }
  if (!uid) {
    console.warn('getUserProfileFromFirestore called with undefined or empty UID.');
    return null;
  }
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const data = userSnap.data()!;

      const userProfile: User = {
        uid: userSnap.id,
        email: data.email || '',
        fullName: data.fullName || null,
        accountType: data.accountType || 'client',
        photoURL: data.photoURL || null,
        phoneNumber: data.phoneNumber || null,
        providerProfileId: data.providerProfileId || undefined,
        createdAt: convertPotentialAdminTimestampToDate(data.createdAt),
        updatedAt: convertPotentialAdminTimestampToDate(data.updatedAt),
      };

      if (userProfile.providerProfileId === undefined) {
        delete userProfile.providerProfileId;
      }
      return userProfile;
    } else {
      console.warn(`No user profile document found in Firestore (Admin SDK) for UID: ${uid}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error in getUserProfileFromFirestore (Admin SDK) for UID: ${uid}.`);
    console.error("Original Error Object:", error);
    console.error("Original Error Message:", error.message);
    console.error("Original Error Stack:", error.stack);
    let errorMessage = "Could not fetch user profile (Admin SDK).";
    if (error && error.message) {
      errorMessage += ` Original issue: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}


/**
 * Creates a default user profile document in Firestore if one doesn't exist, using Admin SDK.
 * @param firebaseUser - The Firebase Auth user object (client-side type).
 * @returns A promise that resolves with the created or existing User object.
 */
export async function createDefaultAppUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Default user profile creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const userRef = adminDb.collection('users').doc(firebaseUser.uid);
  const nowAsAdminTimestamp = AdminFieldValue.serverTimestamp();

  const defaultProfileData: UserDocumentForCreate = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || 'No email provided',
    fullName: firebaseUser.displayName || 'New User',
    accountType: 'client' as AccountType,
    photoURL: firebaseUser.photoURL || null,
    phoneNumber: firebaseUser.phoneNumber || null,
    createdAt: nowAsAdminTimestamp,
    updatedAt: nowAsAdminTimestamp,
  };

  try {
    const existingProfileSnap = await userRef.get();
    if (existingProfileSnap.exists()) {
        console.log(`Profile already exists for UID (Admin SDK): ${firebaseUser.uid}. Returning existing profile.`);
        const existingData = existingProfileSnap.data()!;
        return {
            ...existingData,
            uid: existingProfileSnap.id,
            createdAt: convertPotentialAdminTimestampToDate(existingData.createdAt),
            updatedAt: convertPotentialAdminTimestampToDate(existingData.updatedAt),
        } as User;
    }

    await userRef.set(defaultProfileData);
    console.log(`Default profile created for UID (Admin SDK): ${firebaseUser.uid}`);
    return {
      uid: defaultProfileData.uid,
      email: defaultProfileData.email,
      fullName: defaultProfileData.fullName,
      accountType: defaultProfileData.accountType,
      photoURL: defaultProfileData.photoURL,
      phoneNumber: defaultProfileData.phoneNumber,
      createdAt: new Date(), 
      updatedAt: new Date(), 
    } as User;
  } catch (error) {
    console.error(`Error creating or checking default user profile (Admin SDK) for UID ${firebaseUser.uid}:`, error);
    throw new Error('Could not create or check default user profile.');
  }
}

/**
 * Updates a user's profile photo URL using Admin SDK.
 * @param uid - The user's unique ID.
 * @param newPhotoURL - The new URL of the profile picture.
 */
export async function updateUserPhotoURL(uid: string, newPhotoURL: string): Promise<void> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot update user photo URL.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const updatePayload: Partial<User> & { updatedAt: admin.firestore.FieldValue } = {
        photoURL: newPhotoURL,
        updatedAt: AdminFieldValue.serverTimestamp(),
    };
    await userRef.update(updatePayload as UpdateData<UserDocumentForCreate>);
  } catch (error) {
    console.error('Error updating user photo URL (Admin SDK):', error);
    throw new Error('Could not update user photo URL.');
  }
}
