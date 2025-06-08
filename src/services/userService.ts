
/**
 * @fileOverview Service functions for interacting with user data in Firestore.
 */
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/models/user';

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
    const profileToSave: User = {
        ...userData,
        uid,
        // Ensure phoneNumber is explicitly set to null if not provided, to avoid undefined in Firestore
        phoneNumber: userData.phoneNumber || null,
        createdAt: now as any, // Will be replaced by serverTimestamp
        updatedAt: now as any, // Will be replaced by serverTimestamp
    };
    await setDoc(userRef, profileToSave, { merge: true });
  } catch (error) {
    console.error('Error creating user profile in Firestore:', error);
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
      const userData = userSnap.data();
      // Convert Firestore Timestamps to Date objects
      return {
        ...userData,
        createdAt: (userData.createdAt as Timestamp)?.toDate(),
        updatedAt: (userData.updatedAt as Timestamp)?.toDate(),
      } as User;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile from Firestore:', error);
    throw new Error('Could not fetch user profile.');
  }
}
