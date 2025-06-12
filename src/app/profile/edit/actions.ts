
"use server";

import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { adminDb } from '@/lib/firebaseAdmin'; // Use adminDb
import { uploadFileToStorage } from '@/services/storageService';
import type { ProviderProfile, Certification } from '@/models/provider';
import type { ProviderProfileEditFormValues } from './schemas';
import { revalidatePath } from 'next/cache';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import type { User as AppUser } from '@/models/user';

interface ProviderEditPageData {
  appUser: AppUser | null;
  providerProfile: ProviderProfile | null;
  error?: string;
}

export async function fetchProviderEditPageDataAction(userId: string): Promise<ProviderEditPageData> {
  if (!userId) {
    return { appUser: null, providerProfile: null, error: "User not authenticated." };
  }
  try {
    const appUser = await getUserProfileFromFirestore(userId);
    if (!appUser) {
      return { appUser: null, providerProfile: null, error: "User profile not found." };
    }
    if (appUser.accountType !== 'provider') {
      return { appUser, providerProfile: null, error: "User is not a provider." };
    }
    const providerProfile = await getProviderProfileFromFirestore(userId);
    return { appUser, providerProfile };
  } catch (error: any) {
    console.error("Error fetching provider edit page data:", error);
    return { appUser: null, providerProfile: null, error: error.message || "Failed to load profile data." };
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
  if (!providerId) {
    return { success: false, message: "Provider ID is missing." };
  }
  if (!adminDb) {
    return { success: false, message: "Server error: Admin DB not initialized." };
  }

  try {
    const providerRef = doc(adminDb, 'providerProfiles', providerId);
    const currentTimestamp = serverTimestamp(); // Admin SDK serverTimestamp is just an object

    const certificationsToSave: Certification[] = (data.certifications || []).map((certFormValue, index) => {
      const uploadedDocInfo = uploadedCertificationDocuments?.find(doc => doc.index === index);
      const newDocumentUrl = uploadedDocInfo?.url; 
      const existingDocumentUrl = certFormValue.documentUrl;

      return {
        id: certFormValue.id,
        name: certFormValue.name,
        number: certFormValue.number,
        issuingBody: certFormValue.issuingBody,
        // Ensure dates are converted to Firestore Timestamps for admin SDK
        issueDate: certFormValue.issueDate ? Timestamp.fromDate(new Date(certFormValue.issueDate)).toDate() : null,
        expiryDate: certFormValue.expiryDate ? Timestamp.fromDate(new Date(certFormValue.expiryDate)).toDate() : null,
        documentUrl: newDocumentUrl || existingDocumentUrl || null,
        status: certFormValue.status || 'pending_review',
        verificationNotes: certFormValue.verificationNotes || null,
      };
    });
    
    // Construct the update data carefully, ensuring serverTimestamp is used directly for admin SDK
    const updatePayload: any = { // Use 'any' to allow serverTimestamp directly
      businessName: data.businessName,
      mainService: data.mainService,
      specialties: data.specialties || [],
      bio: data.bio,
      location: data.location,
      fullAddress: data.fullAddress || undefined,
      yearsOfExperience: data.yearsOfExperience,
      contactPhoneNumber: data.contactPhoneNumber,
      operatingHours: data.operatingHours || undefined,
      serviceAreas: data.serviceAreas || [], // Already an array from schema transform
      website: data.website || undefined,
      certifications: certificationsToSave,
      updatedAt: currentTimestamp, // This is fine, serverTimestamp() returns a sentinel for Admin SDK
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

    // For updatedProfile, convert Timestamps back to Dates if needed by client
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
        // updatedAt will be a sentinel, client should re-fetch or handle this
      } 
    };

  } catch (error: any) {
    console.error("Error updating provider profile:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
