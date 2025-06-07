
"use server";

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
  try {
    // Firebase user creation (via phone OTP) is now expected to happen on the client-side.
    // This action receives the firebaseUserId after successful client-side OTP verification.

    // Step 1: Create user profile in Firestore using the actual Firebase UID
    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: null, // Email is no longer collected
      fullName: values.fullName,
      phoneNumber: values.phoneNumber,
      accountType: values.accountType as AccountType,
      photoURL: null,
      providerProfileId: values.accountType === 'provider' ? firebaseUserId : undefined,
    };
    await createUserProfileInFirestore(userProfileData, firebaseUserId);

    // Step 2: If account type is provider, create a basic provider profile
    if (values.accountType === 'provider') {
      const providerProfileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'> = {
        id: firebaseUserId, 
        userId: firebaseUserId,
        businessName: values.fullName,
        mainService: 'Other', 
        specialties: [],
        bio: `Fundi specializing in various services. Profile for ${values.fullName}.`,
        location: 'Nairobi', 
        yearsOfExperience: 0,
        isVerified: false,
        certifications: [],
        portfolio: [],
        contactPhoneNumber: values.phoneNumber,
        operatingHours: "Mon-Fri 9am-5pm",
        serviceAreas: ["Nairobi"],
      };
      await createProviderProfileInFirestore(providerProfileData);
    }

    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error("Signup Action Error (Firestore Profile Creation):", error);
    return { success: false, message: error.message || "An unexpected error occurred while creating your profile." };
  }
}
