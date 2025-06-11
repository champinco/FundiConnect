
"use server";

import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadFileToStorage } from '@/services/storageService';
import type { ProviderProfile, Certification } from '@/models/provider';
import type { ProviderProfileEditFormValues, CertificationFormValues } from './schemas';
import { revalidatePath } from 'next/cache';

interface UpdateProviderProfileResult {
  success: boolean;
  message: string;
  updatedProfile?: Partial<ProviderProfile>; // Return the fields that were updated
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

  try {
    const providerRef = doc(db, 'providerProfiles', providerId);

    const currentTimestamp = serverTimestamp();

    const certificationsToSave: Certification[] = (data.certifications || []).map((certFormValue, index) => {
      const uploadedDocInfo = uploadedCertificationDocuments?.find(doc => doc.index === index);
      const newDocumentUrl = uploadedDocInfo?.url; // URL from new upload for this cert
      const existingDocumentUrl = certFormValue.documentUrl; // URL already on the cert

      return {
        id: certFormValue.id, // Preserve existing ID or use new client-generated UUID
        name: certFormValue.name,
        number: certFormValue.number,
        issuingBody: certFormValue.issuingBody,
        issueDate: certFormValue.issueDate ? Timestamp.fromDate(new Date(certFormValue.issueDate)).toDate() : null,
        expiryDate: certFormValue.expiryDate ? Timestamp.fromDate(new Date(certFormValue.expiryDate)).toDate() : null,
        documentUrl: newDocumentUrl || existingDocumentUrl || null,
        status: certFormValue.status || 'pending_review', // Default for new/edited if not set
        verificationNotes: certFormValue.verificationNotes || null,
      };
    });

    const updateData: Partial<Omit<ProviderProfile, 'id' | 'userId' | 'createdAt' | 'rating' | 'reviewsCount'>> = {
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
      updatedAt: currentTimestamp as any, // Cast because serverTimestamp is special
    };

    if (uploadedProfilePictureUrl !== undefined) {
      updateData.profilePictureUrl = uploadedProfilePictureUrl;
    }
    if (uploadedBannerImageUrl !== undefined) {
      updateData.bannerImageUrl = uploadedBannerImageUrl;
    }

    await updateDoc(providerRef, updateData);
    
    revalidatePath(`/providers/${providerId}`); // Revalidate public profile page
    revalidatePath(`/profile/edit`); // Revalidate edit page

    return { 
      success: true, 
      message: "Profile updated successfully!",
      updatedProfile: { // Return the updated values to potentially update client state
        ...updateData,
        certifications: certificationsToSave, // ensure dates are JS Dates if client needs them
      } 
    };

  } catch (error: any) {
    console.error("Error updating provider profile:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}
