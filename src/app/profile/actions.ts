
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
    const errorMsg = "[fetchUserProfilePageDataAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { appUser: null, providerProfile: null, error: "Server error: Core database service unavailable." };
  }

  if (!userId) {
    return { appUser: null, providerProfile: null, error: "User not authenticated." };
  }

  try {
    let userProfile = await getUserProfileFromFirestore(userId);

    if (!userProfile && clientFirebaseUser) {
      console.log(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}. Attempting to create default profile.`);
      try {
        userProfile = await createDefaultAppUserProfile(clientFirebaseUser);
        console.log(`[fetchUserProfilePageDataAction] Default profile created successfully for UID: ${userId}`);
      } catch (creationError: any) {
        console.error(`[fetchUserProfilePageDataAction] Failed to create default profile for UID: ${userId}. Error:`, creationError.message, creationError.stack, creationError.code);
        return { appUser: null, providerProfile: null, error: `Failed to create default profile: ${creationError.message}` };
      }
    } else if (!userProfile && !clientFirebaseUser) {
         console.warn(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}, and no client FirebaseUser provided to create default.`);
         return { appUser: null, providerProfile: null, error: "User profile not found and cannot create default without client user info." };
    }

    if (!userProfile) {
        console.error(`[fetchUserProfilePageDataAction] userProfile is null after creation/fetch attempt for UID: ${userId}. This should not happen.`);
        return { appUser: null, providerProfile: null, error: "Critical error: User profile is unexpectedly null." };
    }

    if (userProfile.accountType === 'provider') {
      const providerProfileData = await getProviderProfileFromFirestore(userId);
      return { appUser: userProfile, providerProfile: providerProfileData };
    }

    return { appUser: userProfile, providerProfile: null };

  } catch (error: any) {
    console.error(`[fetchUserProfilePageDataAction] Error fetching profile for User ID: ${userId}. Error:`, error.message, error.stack, error.code);
    return { appUser: null, providerProfile: null, error: `Failed to load profile data: ${error.message}.` };
  }
}
