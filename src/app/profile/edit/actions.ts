
"use server";

import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { adminDb } from '@/lib/firebaseAdmin'; 
import { uploadFileToStorage } from '@/services/storageService';
import type { ProviderProfile, Certification } from '@/models/provider';
import type { ProviderProfileEditFormValues } from './schemas';
import { revalidatePath } from 'next/cache';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore, createProviderProfileInFirestore } from '@/services/providerService'; 
import type { User as AppUser } from '@/models/user';
import type { ServiceCategory } from '@/components/service-category-icon';


// Helper to ensure adminDb is available
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[ProviderEditActions] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

interface ProviderEditPageData {
  appUser: AppUser | null;
  providerProfile: ProviderProfile | null;
  error?: string;
}

export async function fetchProviderEditPageDataAction(userId: string): Promise<ProviderEditPageData> {
  ensureDbInitialized();

  if (!userId) {
    return { appUser: null, providerProfile: null, error: "User not authenticated." };
  }
  try {
    const appUser = await getUserProfileFromFirestore(userId);
    if (!appUser) {
      return { appUser: null, providerProfile: null, error: "User profile not found." };
    }
    if (appUser.accountType !== 'provider') {
      return { appUser, providerProfile: null, error: "User is not a provider. Profile editing is for providers." };
    }

    let providerProfile = await getProviderProfileFromFirestore(userId);

    if (!providerProfile) {
      console.warn(`[fetchProviderEditPageDataAction] Provider profile not found for provider UID: ${userId}. Attempting to create a default profile.`);
      
      const defaultProviderData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'> = {
        id: userId,
        userId: userId,
        businessName: appUser.fullName || `Provider ${userId.substring(0, 6)}`,
        mainService: 'Other' as ServiceCategory,
        specialties: [],
        bio: 'Welcome to FundiConnect! Please complete your profile to attract clients.',
        location: 'Please update your location',
        fullAddress: undefined,
        yearsOfExperience: 0,
        isVerified: false,
        verificationAuthority: undefined,
        certifications: [],
        portfolio: [],
        contactPhoneNumber: appUser.phoneNumber || '',
        operatingHours: 'Mon-Fri 9am-5pm', 
        serviceAreas: [],
        profilePictureUrl: appUser.photoURL || undefined,
        bannerImageUrl: undefined,
        website: undefined,
        socialMediaLinks: undefined,
      };

      try {
        await createProviderProfileInFirestore(defaultProviderData);
        console.log(`[fetchProviderEditPageDataAction] Default provider profile created for UID: ${userId}`);
        providerProfile = await getProviderProfileFromFirestore(userId);
        if (!providerProfile) {
           console.error(`[fetchProviderEditPageDataAction] CRITICAL: Failed to re-fetch provider profile after default creation for UID: ${userId}.`);
           return { appUser, providerProfile: null, error: "Failed to load profile after attempting to create a default. Please try again." };
        }
      } catch (creationError: any) {
        console.error(`[fetchProviderEditPageDataAction] Error creating default provider profile for UID: ${userId}. Details:`, creationError.message, creationError.stack);
        return { appUser, providerProfile: null, error: `Failed to initialize provider profile: ${creationError.message}. Please contact support.` };
      }
    }
    
    return { appUser, providerProfile };

  } catch (error: any) {
    console.error("[fetchProviderEditPageDataAction] Error fetching provider edit page data. User ID:", userId, "Error Details:", error.message, error.stack);
    return { appUser: null, providerProfile: null, error: error.message || "Failed to load profile data due to an unexpected server error." };
  }
}


interface UpdateProviderProfileResult {
  success: boolean;
  message: string;
  updatedProfile?: Partial<ProviderProfile>; 
}

export async function updateProviderProfileAction(
  providerId: string,
  data: ProviderProfileEditFormValues,
  uploadedProfilePictureUrl?: string | null,
  uploadedBannerImageUrl?: string | null,
  uploadedCertificationDocuments?: Array<{ index: number; url: string | null }>
): Promise<UpdateProviderProfileResult> {
  ensureDbInitialized();

  if (!providerId) {
    return { success: false, message: "Provider ID is missing." };
  }

  try {
    const providerRef = doc(adminDb, 'providerProfiles', providerId);
    const currentTimestamp = serverTimestamp(); 

    const certificationsToSave: Certification[] = (data.certifications || []).map((certFormValue, index) => {
      const uploadedDocInfo = uploadedCertificationDocuments?.find(doc => doc.index === index);
      const newDocumentUrl = uploadedDocInfo?.url; 
      const existingDocumentUrl = certFormValue.documentUrl;

      return {
        id: certFormValue.id,
        name: certFormValue.name,
        number: certFormValue.number,
        issuingBody: certFormValue.issuingBody,
        issueDate: certFormValue.issueDate ? Timestamp.fromDate(new Date(certFormValue.issueDate)).toDate() : null,
        expiryDate: certFormValue.expiryDate ? Timestamp.fromDate(new Date(certFormValue.expiryDate)).toDate() : null,
        documentUrl: newDocumentUrl || existingDocumentUrl || null,
        status: certFormValue.status || 'pending_review',
        verificationNotes: certFormValue.verificationNotes || null,
      };
    });
    
    const updatePayload: any = { 
      businessName: data.businessName,
      mainService: data.mainService,
      specialties: data.specialties || [],
      bio: data.bio,
      location: data.location,
      fullAddress: data.fullAddress || undefined,
      yearsOfExperience: data.yearsOfExperience,
      contactPhoneNumber: data.contactPhoneNumber,
      operatingHours: data.operatingHours || undefined,
      serviceAreas: data.serviceAreas || [], 
      website: data.website || undefined,
      certifications: certificationsToSave,
      updatedAt: currentTimestamp, 
    };


    if (uploadedProfilePictureUrl !== undefined) {
      updatePayload.profilePictureUrl = uploadedProfilePictureUrl;
    }
    if (uploadedBannerImageUrl !== undefined) {
      updatePayload.bannerImageUrl = uploadedBannerImageUrl;
    }
    
    await updateDoc(providerRef, updatePayload);
    
    revalidatePath(`/providers/${providerId}`);
    revalidatePath(`/profile/edit`);

     const clientSafeCertifications = certificationsToSave.map(cert => ({
      ...cert,
      issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
      expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
    }));


    return { 
      success: true, 
      message: "Profile updated successfully!",
      updatedProfile: { 
        ...updatePayload,
        certifications: clientSafeCertifications,
      } 
    };

  } catch (error: any) {
    console.error("[updateProviderProfileAction] Error updating provider profile. Provider ID:", providerId, "Error Details:", error.message, error.stack);
    return { success: false, message: error.message || "An unexpected error occurred while updating profile." };
  }
}
