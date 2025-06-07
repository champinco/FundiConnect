
"use server";

import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Firebase auth instance
import { createUserProfileInFirestore } from '@/services/userService';
import { createProviderProfileInFirestore } from '@/services/providerService';
import type { User, AccountType } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';

// Schema for signup form data (excluding password confirmation)
export const signupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  accountType: z.enum(['client', 'provider']),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

interface SignupResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function signupUserAction(values: SignupFormValues): Promise<SignupResult> {
  try {
    // Step 1: Create user with Firebase Authentication (This part is typically client-side,
    // but for action structure, we simulate the data that would come from it)
    // In a real scenario, you'd call Firebase Auth on client, then pass UID and email to a server action.
    // For this example, let's assume Firebase Auth was successful and we have a UID.
    // const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
    // const firebaseUser = userCredential.user;
    // const uid = firebaseUser.uid;
    // For now, we'll mock a UID. In a real app, this comes from Firebase Auth.
    const mockUid = `mock-${Date.now()}`; 

    // Step 2: Create user profile in Firestore
    const userProfileData: Omit<User, 'createdAt' | 'updatedAt' | 'uid'> = {
      email: values.email,
      fullName: values.fullName,
      phoneNumber: values.phoneNumber,
      accountType: values.accountType as AccountType,
      photoURL: null, 
      providerProfileId: values.accountType === 'provider' ? mockUid : undefined,
    };
    await createUserProfileInFirestore(userProfileData, mockUid);

    // Step 3: If account type is provider, create a basic provider profile
    if (values.accountType === 'provider') {
      const providerProfileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'> = {
        id: mockUid, // Provider profile ID is same as user UID
        userId: mockUid,
        businessName: values.fullName, // Default to full name
        mainService: 'Other', // Default, user can update later
        specialties: [],
        bio: `Fundi specializing in various services. Profile for ${values.fullName}.`,
        location: 'Nairobi', // Default, user can update
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

    return { success: true, message: "Account created successfully!", userId: mockUid };
  } catch (error: any) {
    console.error("Signup Action Error:", error);
    // Handle Firebase Auth errors (e.g., email-already-in-use) specifically if not mocking
    // if (error.code === 'auth/email-already-in-use') {
    //   return { success: false, message: "This email address is already in use." };
    // }
    return { success: false, message: error.message || "An unexpected error occurred during signup." };
  }
}
