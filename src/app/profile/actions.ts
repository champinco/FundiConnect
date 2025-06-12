
"use server";

import { auth } from '@/lib/firebase'; // For getting current user server-side if needed
import { getUserProfileFromFirestore, createDefaultAppUserProfile } from '@/services/userService';
import type { User as AppUser } from '@/models/user';
import type { User as FirebaseUser } from 'firebase/auth'; // Client-side FirebaseUser

interface UserProfilePageData {
  appUser: AppUser | null;
  error?: string;
  wasRedirectedToEdit?: boolean;
}

export async function fetchUserProfilePageDataAction(userId: string, clientFirebaseUser: FirebaseUser | null): Promise<UserProfilePageData> {
  if (!userId) {
    return { appUser: null, error: "User not authenticated." };
  }

  try {
    let userProfile = await getUserProfileFromFirestore(userId);

    if (!userProfile && clientFirebaseUser) {
      console.log(`No Firestore profile found for UID: ${userId}. Attempting to create default profile from client FirebaseUser.`);
      try {
        userProfile = await createDefaultAppUserProfile(clientFirebaseUser); // Pass clientFirebaseUser here
        console.log(`Default profile created successfully for UID: ${userId}`);
      } catch (creationError: any) {
        console.error(`Failed to create default profile for UID: ${userId}`, creationError);
        return { appUser: null, error: `Failed to create default profile: ${creationError.message}` };
      }
    } else if (!userProfile && !clientFirebaseUser) {
         console.warn(`No Firestore profile found for UID: ${userId}, and no client FirebaseUser provided to create default.`);
         return { appUser: null, error: "User profile not found and cannot create default without client user info." };
    }


    if (userProfile?.accountType === 'provider') {
      return { appUser: userProfile, wasRedirectedToEdit: true };
    }

    return { appUser: userProfile };

  } catch (error: any) {
    console.error("Error in fetchUserProfilePageDataAction:", error);
    return { appUser: null, error: error.message || "Failed to load user profile data." };
  }
}
