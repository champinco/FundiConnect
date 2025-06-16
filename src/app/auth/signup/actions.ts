
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { createUserProfileInFirestore } from '@/services/userService';
import { createProviderProfileInFirestore } from '@/services/providerService';
import type { User, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { SignupFormValues } from './schemas';

interface SignupResult {
  success: boolean;
  message: string;
  userId?: string;
  firebaseUserId?: string;
}

export async function signupUserAction(values: SignupFormValues, firebaseUserId: string): Promise<SignupResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[signupUserAction] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service is not available. Please try again later." };
  }

  console.log("[signupUserAction] Initiated for firebaseUserId:", firebaseUserId);
  try {
    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: values.email,
      fullName: values.fullName,
      phoneNumber: values.accountType === 'provider' ? values.contactPhoneNumber : null,
      accountType: values.accountType as AccountType,
      photoURL: values.accountType === 'provider' ? values.profilePictureUrl : null, // Use passed URL
      providerProfileId: values.accountType === 'provider' ? firebaseUserId : undefined,
    };

    console.log("[signupUserAction] Attempting to create user profile in Firestore with data:", JSON.stringify(userProfileData));
    await createUserProfileInFirestore(userProfileData, firebaseUserId);
    console.log("[signupUserAction] Successfully created user profile in Firestore for UID:", firebaseUserId);

    if (values.accountType === 'provider') {
      const providerProfileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'> = {
        id: firebaseUserId,
        userId: firebaseUserId,
        businessName: values.businessName || values.fullName,
        mainService: values.mainService || 'Other',
        specialties: [],
        bio: values.bio || `Fundi specializing in ${values.mainService || 'various services'}. Profile for ${values.businessName || values.fullName}.`,
        location: values.providerLocation || 'Nairobi',
        fullAddress: null, // Not collected at signup
        yearsOfExperience: values.yearsOfExperience !== undefined ? Number(values.yearsOfExperience) : 0,
        contactPhoneNumber: values.contactPhoneNumber || "",
        profilePictureUrl: values.profilePictureUrl || null, // Use passed URL
        bannerImageUrl: null, // Not collected at signup
        website: null, // Not collected at signup
        socialMediaLinks: null, // Not collected at signup
        isVerified: false,
        verificationAuthority: null, // Not set at signup
        certifications: [],
        portfolio: [],
        operatingHours: "Mon-Fri 9am-5pm", // Default or make optional later
        serviceAreas: values.providerLocation ? [values.providerLocation] : ["Nairobi"], // Default based on location
      };
      console.log("[signupUserAction] Attempting to create provider profile in Firestore with data:", JSON.stringify(providerProfileData));
      await createProviderProfileInFirestore(providerProfileData);
      console.log("[signupUserAction] Successfully created provider profile in Firestore for UID:", firebaseUserId);
    }

    console.log("[signupUserAction] All profiles created successfully for firebaseUserId:", firebaseUserId);
    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error(`[signupUserAction] Error during profile creation for firebaseUserId: ${firebaseUserId}. Values: ${JSON.stringify(values)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to create profile: ${error.message}. Check server logs.` };
  }
}
