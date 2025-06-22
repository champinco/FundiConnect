
"use server";

import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { uploadFileToStorage } from '@/services/storageService';
import type { ProviderProfile, Certification, PortfolioItem } from '@/models/provider';
import type { ProviderProfileEditFormValues } from './schemas';
import { revalidatePath } from 'next/cache';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore, createProviderProfileInFirestore } from '@/services/providerService';
import type { User as AppUser } from '@/models/user';
import type { ServiceCategory } from '@/components/service-category-icon';
import { format } from 'date-fns';


interface ProviderEditPageData {
  appUser: AppUser | null;
  providerProfile: ProviderProfile | null;
  error?: string;
}

export async function fetchProviderEditPageDataAction(userId: string): Promise<ProviderEditPageData> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchProviderEditPageDataAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { appUser: null, providerProfile: null, error: "Server error: Core database service unavailable." };
  }

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
        otherMainServiceDescription: '', // Initialize as empty
        specialties: [],
        skills: [], 
        bio: 'Welcome to FundiConnect! Please complete your profile to attract clients.',
        location: 'Please update your location',
        fullAddress: null,
        yearsOfExperience: 0,
        isVerified: false,
        verificationAuthority: null,
        certifications: [],
        portfolio: [],
        contactPhoneNumber: appUser.phoneNumber || '',
        operatingHours: "Mon-Fri 9am-5pm",
        serviceAreas: [],
        profilePictureUrl: appUser.photoURL || null,
        bannerImageUrl: null,
        socialMediaLinks: null,
        unavailableDates: [], 
        receivesEmergencyJobAlerts: false,
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
        console.error(`[fetchProviderEditPageDataAction] Error creating default provider profile for UID: ${userId}. Error:`, creationError.message, creationError.stack, creationError.code);
        return { appUser, providerProfile: null, error: `Failed to initialize provider profile: ${creationError.message}. Please contact support.` };
      }
    }
    
    return { appUser, providerProfile };

  } catch (error: any) {
    console.error(`[fetchProviderEditPageDataAction] Error fetching provider edit page data for User ID: ${userId}. Error:`, error.message, error.stack, error.code);
    return { appUser: null, providerProfile: null, error: `Failed to load profile data: ${error.message}.` };
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
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[updateProviderProfileAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }

  if (!providerId) {
    return { success: false, message: "Provider ID is missing." };
  }

  try {
    const providerRef = adminDb.collection('providerProfiles').doc(providerId);

    const certificationsToSave: Certification[] = (data.certifications || []).map((certFormValue, index) => {
      const uploadedDocInfo = uploadedCertificationDocuments?.find(doc => doc.index === index);
      const newDocumentUrl = uploadedDocInfo?.url;
      const existingDocumentUrl = certFormValue.documentUrl;

      return {
        id: certFormValue.id,
        name: certFormValue.name,
        number: certFormValue.number,
        issuingBody: certFormValue.issuingBody,
        issueDate: certFormValue.issueDate ? new Date(certFormValue.issueDate) : null,
        expiryDate: certFormValue.expiryDate ? new Date(certFormValue.expiryDate) : null,
        documentUrl: newDocumentUrl || existingDocumentUrl || null,
        status: certFormValue.status || 'pending_review',
        verificationNotes: certFormValue.verificationNotes || null,
      };
    });
    
    const portfolioToSave: PortfolioItem[] = (data.portfolio || []).map(item => ({
        id: item.id || '', 
        description: item.description,
        imageUrl: item.imageUrl || null,
        dataAiHint: item.dataAiHint || item.description.split(" ").slice(0,2).join(" ") || "project image",
    }));

    const specialtiesArray = Array.isArray(data.specialties) ? data.specialties : (typeof data.specialties === 'string' ? data.specialties.split(',').map(s => s.trim()).filter(s => s) : []);
    const skillsArray = Array.isArray(data.skills) ? data.skills : (typeof data.skills === 'string' ? data.skills.split(',').map(s => s.trim()).filter(s => s) : []);
    const serviceAreasArray = Array.isArray(data.serviceAreas) ? data.serviceAreas : (typeof data.serviceAreas === 'string' ? data.serviceAreas.split(',').map(s => s.trim()).filter(s => s) : []);

    const socialMediaLinks: Record<string, string> = {};
    if (data.twitterUrl) socialMediaLinks.twitter = data.twitterUrl;
    if (data.instagramUrl) socialMediaLinks.instagram = data.instagramUrl;
    if (data.facebookUrl) socialMediaLinks.facebook = data.facebookUrl;
    if (data.linkedinUrl) socialMediaLinks.linkedin = data.linkedinUrl;

    const updatePayload: any = {
      businessName: data.businessName,
      mainService: data.mainService,
      otherMainServiceDescription: data.mainService === 'Other' && data.otherMainServiceDescription ? data.otherMainServiceDescription.trim() : null,
      specialties: specialtiesArray,
      skills: skillsArray,
      bio: data.bio,
      location: data.location,
      fullAddress: data.fullAddress || null,
      yearsOfExperience: data.yearsOfExperience,
      contactPhoneNumber: data.contactPhoneNumber,
      operatingHours: data.operatingHours || null,
      serviceAreas: serviceAreasArray,
      website: data.website || null,
      socialMediaLinks: Object.keys(socialMediaLinks).length > 0 ? socialMediaLinks : null,
      certifications: certificationsToSave.map(cert => ({
        ...cert,
        issueDate: cert.issueDate ? Timestamp.fromDate(new Date(cert.issueDate)) : null,
        expiryDate: cert.expiryDate ? Timestamp.fromDate(new Date(cert.expiryDate)) : null,
      })),
      portfolio: portfolioToSave,
      unavailableDates: (data.unavailableDates || []).map(date => format(date, 'yyyy-MM-dd')),
      receivesEmergencyJobAlerts: data.receivesEmergencyJobAlerts || false,
      updatedAt: serverTimestamp(),
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

    // Create a serializable version of the profile to return to the client.
    // Omit the 'updatedAt' field which contains a non-serializable serverTimestamp.
    const { updatedAt, ...serializablePayload } = updatePayload;

    const updatedProfileForClient: Partial<ProviderProfile> = {
      ...serializablePayload,
      certifications: (serializablePayload.certifications || []).map((cert:any) => ({
        ...cert,
        issueDate: cert.issueDate ? cert.issueDate.toDate() : null,
        expiryDate: cert.expiryDate ? cert.expiryDate.toDate() : null,
      })),
      portfolio: serializablePayload.portfolio,
    };
    
    return {
      success: true,
      message: "Profile updated successfully!",
      updatedProfile: updatedProfileForClient
    };

  } catch (error: any) {
    console.error(`[updateProviderProfileAction] Error updating profile for Provider ID: ${providerId}. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to update profile: ${error.message}.` };
  }
}
