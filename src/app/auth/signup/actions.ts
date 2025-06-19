
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { createUserProfileInFirestore } from '@/services/userService';
import { createProviderProfileInFirestore } from '@/services/providerService';
import type { User, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { SignupFormValues } from './schemas';
import { sendWelcomeEmail } from '@/services/emailService'; 

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
      photoURL: values.profilePictureUrl || null, 
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
        skills: [], 
        bio: values.bio || `Fundi specializing in ${values.mainService || 'various services'}. Profile for ${values.businessName || values.fullName}.`,
        location: values.providerLocation || 'Nairobi',
        fullAddress: null, 
        yearsOfExperience: values.yearsOfExperience !== undefined ? Number(values.yearsOfExperience) : 0,
        contactPhoneNumber: values.contactPhoneNumber || "",
        profilePictureUrl: values.profilePictureUrl || null, 
        bannerImageUrl: values.bannerImageUrl || null, 
        website: null, 
        socialMediaLinks: null, 
        isVerified: false,
        verificationAuthority: null, 
        certifications: [],
        portfolio: [],
        operatingHours: "Mon-Fri 9am-5pm", 
        serviceAreas: values.providerLocation ? [values.providerLocation] : ["Nairobi"], 
        unavailableDates: [],
        receivesEmergencyJobAlerts: false,
      };
      console.log("[signupUserAction] Attempting to create provider profile in Firestore with data:", JSON.stringify(providerProfileData));
      await createProviderProfileInFirestore(providerProfileData);
      console.log("[signupUserAction] Successfully created provider profile in Firestore for UID:", firebaseUserId);
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(values.email, values.fullName);
      console.log(`[signupUserAction] Welcome email queued for ${values.email}`);
    } catch (emailError: any) {
      console.warn(`[signupUserAction] Failed to queue welcome email for ${values.email}: ${emailError.message}`);
    }

    console.log("[signupUserAction] All profiles created successfully for firebaseUserId:", firebaseUserId);
    return { success: true, message: "Account profiles created successfully!", userId: firebaseUserId, firebaseUserId: firebaseUserId };
  } catch (error: any) {
    console.error(`[signupUserAction] Error during profile creation for firebaseUserId: ${firebaseUserId}. Values: ${JSON.stringify(values)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to create profile: ${error.message}. Check server logs.` };
  }
}
