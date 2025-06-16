
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getUserProfileFromFirestore, createDefaultAppUserProfile } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService'; 
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider'; 
import type { User as FirebaseUser } from 'firebase/auth'; 


export interface UserProfilePageData {
  appUser: AppUser | null;
  providerProfile?: ProviderProfile | null; 
  error?: string;
}

export async function fetchUserProfilePageDataAction(userId: string, clientFirebaseUser: FirebaseUser | null): Promise<UserProfilePageData> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchUserProfilePageDataAction] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    return { appUser: null, error: "Server error: Core database service is not available. Please try again later." };
  }

  if (!userId) {
    return { appUser: null, error: "User not authenticated." };
  }

  try {
    let userProfile = await getUserProfileFromFirestore(userId);

    if (!userProfile && clientFirebaseUser) {
      console.log(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}. Attempting to create default profile from client FirebaseUser.`);
      try {
        userProfile = await createDefaultAppUserProfile(clientFirebaseUser); 
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
      const providerProfileData = await getProviderProfileFromFirestore(userId);
      // Removed wasRedirectedToEdit: true
      return { appUser: userProfile, providerProfile: providerProfileData };
    }

    return { appUser: userProfile, providerProfile: null };

  } catch (error: any) {
    console.error("[fetchUserProfilePageDataAction] Error fetching user profile. User ID:", userId, "Error Details:", error.message, error.stack);
    return { appUser: null, error: error.message || "Failed to load user profile data due to an unexpected server error." };
  }
}

