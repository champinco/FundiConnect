
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getUserProfileFromFirestore, createDefaultAppUserProfile } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import type { User as AppUser, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';

// Define a serializable object type for client user data
interface ClientFirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
}

export interface UserProfilePageData {
  appUser: AppUser | null;
  providerProfile?: ProviderProfile | null;
  error?: string;
}

export async function fetchUserProfilePageDataAction(userId: string, clientFirebaseUser: ClientFirebaseUser | null): Promise<UserProfilePageData> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchUserProfilePageDataAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { appUser: null, providerProfile: null, error: "Server error: Core database service unavailable. Please try again later." };
  }

  if (!userId) {
    return { appUser: null, providerProfile: null, error: "User not authenticated." };
  }
  console.log(`[fetchUserProfilePageDataAction] Initiated for userId: ${userId}`);

  try {
    let userProfile = await getUserProfileFromFirestore(userId);

    if (!userProfile && clientFirebaseUser) {
      console.log(`[fetchUserProfilePageDataAction] No Firestore profile found for UID: ${userId}. Attempting to create default profile using clientFirebaseUser data.`);
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
        // This case should ideally be caught by the logic above.
        console.error(`[fetchUserProfilePageDataAction] userProfile is null after creation/fetch attempt for UID: ${userId}. This indicates a critical issue.`);
        return { appUser: null, providerProfile: null, error: "Critical error: User profile is unexpectedly null after processing." };
    }

    console.log(`[fetchUserProfilePageDataAction] User profile loaded for ${userId}. Account type: ${userProfile.accountType}`);

    if (userProfile.accountType === 'provider') {
      console.log(`[fetchUserProfilePageDataAction] User is a provider. Fetching provider profile for ${userId}.`);
      const providerProfileData = await getProviderProfileFromFirestore(userId);
      if (!providerProfileData) {
        console.warn(`[fetchUserProfilePageDataAction] Provider profile document not found for provider user ID: ${userId}. This might indicate an incomplete signup.`);
        // Depending on desired behavior, you might return an error or allow the page to show a partial profile.
        // For now, returning the appUser and null providerProfile.
        return { appUser: userProfile, providerProfile: null };
      }
      console.log(`[fetchUserProfilePageDataAction] Provider profile data loaded for ${userId}.`);
      return { appUser: userProfile, providerProfile: providerProfileData };
    }
    console.log(`[fetchUserProfilePageDataAction] User is a client. Returning appUser only for ${userId}.`);
    return { appUser: userProfile, providerProfile: null };

  } catch (error: any) {
    console.error(`[fetchUserProfilePageDataAction] Error fetching profile for User ID: ${userId}. Error:`, error.message, error.stack, error.code);
    return { appUser: null, providerProfile: null, error: `Failed to load profile data: ${error.message}.` };
  }
}

export async function fetchCurrentAppUserTypeAction(userId: string | null): Promise<AccountType | null> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchCurrentAppUserTypeAction] CRITICAL: Firebase Admin DB not initialized.");
    return null; // Or throw, but for a type check, null might be safer for client.
  }
  if (!userId) {
    // console.log("[fetchCurrentAppUserTypeAction] No userId provided.");
    return null;
  }
  try {
    const userProfile = await getUserProfileFromFirestore(userId);
    return userProfile?.accountType || null;
  } catch (error) {
    console.error(`[fetchCurrentAppUserTypeAction] Error fetching account type for ${userId}:`, error);
    return null;
  }
}
