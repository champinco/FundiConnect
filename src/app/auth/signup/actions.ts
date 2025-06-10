
"use server";

import { createUserProfileInFirestore } from '@/services/userService';
import { createProviderProfileInFirestore } from '@/services/providerService';
import type { User, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { SignupFormValues } from './schemas'; // This now includes more fields

interface SignupResult {
  success: boolean;
  message: string;
  userId?: string;
  firebaseUserId?: string;
}

export async function signupUserAction(values: SignupFormValues, firebaseUserId: string): Promise<SignupResult> {
  try {
    // Firebase user creation (email/password) happens on the client-side.
    // This action receives the firebaseUserId after successful client-side auth.

    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: values.email,
      fullName: values.fullName,
      phoneNumber: values.accountType === 'provider' ? values.contactPhoneNumber : null, // Use contactPhoneNumber for provider's main phone
      accountType: values.accountType as AccountType,
      photoURL: values.accountType === 'provider' ? values.profilePictureUrl : null,
      providerProfileId: values.accountType === 'provider' ? firebaseUserId : undefined,
    };
    await createUserProfileInFirestore(userProfileData, firebaseUserId);

    if (values.accountType === 'provider') {
      // Ensure all required provider fields from the form are passed, or have defaults if not made mandatory in schema for provider
      const providerProfileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount' | 'isVerified' | 'certifications' | 'portfolio' | 'operatingHours' | 'serviceAreas'> & Partial<Pick<ProviderProfile, 'operatingHours' | 'serviceAreas'>> = {
        id: firebaseUserId,
        userId: firebaseUserId,
        businessName: values.businessName || values.fullName, // Default to full name if businessName not provided
        mainService: values.mainService || 'Other', 
        specialties: [], // Keep empty for now, can be updated in profile management
        bio: values.bio || `Fundi specializing in ${values.mainService || 'various services'}. Profile for ${values.businessName || values.fullName}.`,
        location: values.providerLocation || 'Nairobi', 
        yearsOfExperience: values.yearsOfExperience !== undefined ? Number(values.yearsOfExperience) : 0,
        contactPhoneNumber: values.contactPhoneNumber || "", 
        profilePictureUrl: values.profilePictureUrl || undefined, // Use uploaded URL
        // Default other fields not collected at signup
        isVerified: false,
        certifications: [],
        portfolio: [],
        operatingHours: "Mon-Fri 9am-5pm", 
        serviceAreas: values.providerLocation ? [values.providerLocation] : ["Nairobi"], 
      };
      await createProviderProfileInFirestore(providerProfileData);
    }

    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error("Signup Action Error (Firestore Profile Creation):", error);
    return { success: false, message: error.message || "An unexpected error occurred while creating your profile." };
  }
}
