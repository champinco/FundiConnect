
"use server";

import { auth } from '@/lib/firebase'; // For getting current user server-side if needed by actions
import { getUserProfileFromFirestore, createDefaultAppUserProfile } from '@/services/userService';
import type { User as AppUser } from '@/models/user';
import type { User as FirebaseUser } from 'firebase/auth'; // Client-side FirebaseUser
import { adminDb } from '@/lib/firebaseAdmin';

interface UserProfilePageData {
  appUser: AppUser | null;
  error?: string;
  wasRedirectedToEdit?: boolean;
}

export async function fetchUserProfilePageDataAction(userId: string, clientFirebaseUser: FirebaseUser | null): Promise<UserProfilePageData> {
  if (!adminDb) {
    console.error("[fetchUserProfilePageDataAction] CRITICAL: Admin DB not initialized. Aborting fetch.");
    return { appUser: null, error: "Server error: Database service is not available. Please try again later." };
  }
  if (!userId) {
    return { appUser: null, error: "User not authenticated." };
  }

  try {
    let userProfile = await getUserProfileFromFirestore(userId);

    if (!userProfile && clientFirebaseUser) {
      console.log(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}. Attempting to create default profile from client FirebaseUser.`);
      try {
        userProfile = await createDefaultAppUserProfile(clientFirebaseUser); // Pass clientFirebaseUser here
        console.log(`[fetchUserProfilePageDataAction] Default profile created successfully for UID: ${userId}`);
      } catch (creationError: any) {
        console.error(`[fetchUserProfilePageDataAction] Failed to create default profile for UID: ${userId}. Error:`, creationError.message, creationError.stack);
        return { appUser: null, error: `Failed to create default profile: ${creationError.message}` };
      }
    } else if (!userProfile && !clientFirebaseUser) {
         console.warn(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}, and no client FirebaseUser provided to create default.`);
         return { appUser: null, error: "User profile not found and cannot create default without client user info." };
    }


    if (userProfile?.accountType === 'provider') {
      return { appUser: userProfile, wasRedirectedToEdit: true };
    }

    return { appUser: userProfile };

  } catch (error: any) {
    console.error("[fetchUserProfilePageDataAction] Error fetching user profile. User ID:", userId, "Error Details:", error.message, error.stack);
    return { appUser: null, error: error.message || "Failed to load user profile data due to an unexpected server error." };
  }
}
