
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

  console.log("[SignupAction] Initiated for firebaseUserId:", firebaseUserId, "with values:", JSON.stringify(values));
  try {
    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: values.email,
      fullName: values.fullName,
      phoneNumber: values.accountType === 'provider' ? values.contactPhoneNumber : null,
      accountType: values.accountType as AccountType,
      photoURL: values.accountType === 'provider' ? values.profilePictureUrl : null,
      providerProfileId: values.accountType === 'provider' ? firebaseUserId : undefined,
    };

    console.log("[SignupAction] Attempting to create user profile in Firestore with data:", JSON.stringify(userProfileData));
    try {
      await createUserProfileInFirestore(userProfileData, firebaseUserId);
      console.log("[SignupAction] Successfully created user profile in Firestore for UID:", firebaseUserId);
    } catch (userProfileError: any) {
      console.error("[SignupAction] Error creating user profile in Firestore for UID:", firebaseUserId, "Details:", userProfileError.message, userProfileError.stack);
      return { success: false, message: `Failed to create user profile: ${userProfileError.message}. Check server logs for details.` };
    }

    if (values.accountType === 'provider') {
      const providerProfileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount' | 'isVerified' | 'certifications' | 'portfolio' | 'operatingHours' | 'serviceAreas'> & Partial<Pick<ProviderProfile, 'operatingHours' | 'serviceAreas'>> = {
        id: firebaseUserId,
        userId: firebaseUserId,
        businessName: values.businessName || values.fullName,
        mainService: values.mainService || 'Other', 
        specialties: [],
        bio: values.bio || `Fundi specializing in ${values.mainService || 'various services'}. Profile for ${values.businessName || values.fullName}.`,
        location: values.providerLocation || 'Nairobi', 
        yearsOfExperience: values.yearsOfExperience !== undefined ? Number(values.yearsOfExperience) : 0,
        contactPhoneNumber: values.contactPhoneNumber || "", 
        profilePictureUrl: values.profilePictureUrl || undefined,
        isVerified: false,
        certifications: [],
        portfolio: [],
        operatingHours: "Mon-Fri 9am-5pm", 
        serviceAreas: values.providerLocation ? [values.providerLocation] : ["Nairobi"], 
      };
      console.log("[SignupAction] Attempting to create provider profile in Firestore with data:", JSON.stringify(providerProfileData));
      try {
        await createProviderProfileInFirestore(providerProfileData);
        console.log("[SignupAction] Successfully created provider profile in Firestore for UID:", firebaseUserId);
      } catch (providerProfileError: any) {
        console.error("[SignupAction] Error creating provider profile in Firestore for UID:", firebaseUserId, "Details:", providerProfileError.message, providerProfileError.stack);
        return { success: false, message: `Failed to create provider profile: ${providerProfileError.message}. Check server logs for details.` };
      }
    }

    console.log("[SignupAction] All profiles created successfully for firebaseUserId:", firebaseUserId);
    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error("[SignupAction] Unexpected overall error during profile creation for firebaseUserId:", firebaseUserId, "Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred while creating your profile details. Check server logs." };
  }
}
