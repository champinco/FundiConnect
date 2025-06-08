
"use server";

import { createUserProfileInFirestore } from '@/services/userService';
import { createProviderProfileInFirestore } from '@/services/providerService';
import type { User, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { SignupFormValues } from './schemas'; // This now includes email, not phoneNumber

interface SignupResult {
  success: boolean;
  message: string;
  userId?: string;
  firebaseUserId?: string;
}

export async function signupUserAction(values: SignupFormValues, firebaseUserId: string): Promise<SignupResult> {
  try {
    // Firebase user creation (now email/password) happens on the client-side.
    // This action receives the firebaseUserId after successful client-side auth.

    // Step 1: Create user profile in Firestore using the actual Firebase UID
    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: values.email, // Email is now primary
      fullName: values.fullName,
      phoneNumber: null, // Phone number is no longer collected at signup
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
        businessName: values.fullName, // Default to full name
        mainService: 'Other', // Default, user can update later
        specialties: [],
        bio: `Fundi specializing in various services. Profile for ${values.fullName}.`,
        location: 'Nairobi', // Default, user can update later
        yearsOfExperience: 0,
        isVerified: false,
        certifications: [],
        portfolio: [],
        contactPhoneNumber: "", // No phone collected at signup, provider can add later
        operatingHours: "Mon-Fri 9am-5pm", // Default
        serviceAreas: ["Nairobi"], // Default
      };
      await createProviderProfileInFirestore(providerProfileData);
    }

    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error("Signup Action Error (Firestore Profile Creation):", error);
    // Potentially, if profile creation fails after auth user is made, we might want to delete the auth user.
    // For now, returning an error.
    return { success: false, message: error.message || "An unexpected error occurred while creating your profile." };
  }
}
