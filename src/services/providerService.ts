
/**
 * @fileOverview Service functions for interacting with provider profile data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin'; // Use Admin SDK
import { Timestamp, FieldValue, type UpdateData } from 'firebase-admin/firestore';
import type { ProviderProfile, Certification, PortfolioItem } from '@/models/provider';
import type { ServiceCategory } from '@/components/service-category-icon';


// Helper function to robustly convert Firestore Timestamps or other date representations to JS Date objects
const robustTimestampToDate = (timestamp: any, defaultVal: Date | null = null): Date | null => {
    if (!timestamp) return defaultVal;
    if (timestamp instanceof Date) { // Already a Date object
        return timestamp;
    }
    if (typeof (timestamp as any).toDate === 'function') { // Firestore Timestamp
        return (timestamp as import('firebase-admin/firestore').Timestamp).toDate();
    }
    // Attempt to parse if it's a string or number (e.g., ISO string, milliseconds)
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
            return d;
        }
    }
    // console.warn('Invalid timestamp encountered during conversion, using default.', timestamp);
    return defaultVal;
};


/**
 * Creates or updates a provider profile document in Firestore using Admin SDK.
 * @param profileData - The provider profile data. The ID should typically be the user's UID.
 * @returns A promise that resolves when the operation is complete.
 */
export async function createProviderProfileInFirestore(profileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'>): Promise<void> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Provider profile creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const profileRef = adminDb.collection('providerProfiles').doc(profileData.id);
    const now = FieldValue.serverTimestamp();

    const certificationsWithAdminTimestamps = (Array.isArray(profileData.certifications) ? profileData.certifications : []).map(cert => ({
      ...cert,
      issueDate: cert.issueDate ? Timestamp.fromDate(new Date(cert.issueDate)) : null,
      expiryDate: cert.expiryDate ? Timestamp.fromDate(new Date(cert.expiryDate)) : null,
    }));

    await profileRef.set({
      ...profileData,
      certifications: certificationsWithAdminTimestamps,
      rating: 0, // Default initial rating
      reviewsCount: 0, // Default initial reviews count
      // Ensure all fields from model are present with defaults if not in profileData
      specialties: Array.isArray(profileData.specialties) ? profileData.specialties : [],
      portfolio: Array.isArray(profileData.portfolio) ? profileData.portfolio : [],
      serviceAreas: Array.isArray(profileData.serviceAreas) ? profileData.serviceAreas : [],
      isVerified: profileData.isVerified || false,
      yearsOfExperience: typeof profileData.yearsOfExperience === 'number' ? profileData.yearsOfExperience : 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    console.error('Error creating provider profile in Firestore (Admin SDK):', error);
    throw new Error('Could not create provider profile.');
  }
}

/**
 * Retrieves a provider profile document from Firestore using Admin SDK.
 * @param providerId - The provider's unique ID (usually user UID).
 * @returns A promise that resolves with the ProviderProfile object or null if not found.
 */
export async function getProviderProfileFromFirestore(providerId: string): Promise<ProviderProfile | null> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch provider profile.");
    return null; // Or throw an error if this state is unexpected
  }
  try {
    const profileRef = adminDb.collection('providerProfiles').doc(providerId);
    const profileSnap = await profileRef.get();

    if (profileSnap.exists) {
      const data = profileSnap.data()!; 

      const certifications = (Array.isArray(data.certifications) ? data.certifications : []).map(cert => ({
          ...cert,
          id: cert.id || '', // Ensure id is a string
          name: cert.name || '',
          number: cert.number || '',
          issuingBody: cert.issuingBody || '',
          documentUrl: cert.documentUrl || null,
          status: cert.status || 'pending_review',
          verificationNotes: cert.verificationNotes || null,
          issueDate: robustTimestampToDate(cert.issueDate, null),
          expiryDate: robustTimestampToDate(cert.expiryDate, null),
      } as Certification));
      
      const portfolio = (Array.isArray(data.portfolio) ? data.portfolio : []).map(item => ({
          id: item.id || '',
          imageUrl: item.imageUrl || '',
          description: item.description || '',
          dataAiHint: item.dataAiHint,
      } as PortfolioItem));


      return {
        id: profileSnap.id,
        userId: data.userId || '',
        businessName: data.businessName || 'N/A',
        mainService: data.mainService || 'Other',
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        bio: data.bio || '',
        location: data.location || 'N/A',
        fullAddress: data.fullAddress,
        yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : 0,
        isVerified: !!data.isVerified,
        verificationAuthority: data.verificationAuthority,
        portfolio,
        rating: typeof data.rating === 'number' ? data.rating : 0,
        reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
        contactPhoneNumber: data.contactPhoneNumber || '',
        operatingHours: data.operatingHours,
        serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
        profilePictureUrl: data.profilePictureUrl,
        bannerImageUrl: data.bannerImageUrl,
        website: data.website,
        socialMediaLinks: typeof data.socialMediaLinks === 'object' && data.socialMediaLinks !== null ? data.socialMediaLinks : undefined,
        createdAt: robustTimestampToDate(data.createdAt, new Date())!, // createdAt is not optional
        updatedAt: robustTimestampToDate(data.updatedAt, new Date())!, // updatedAt is not optional
        certifications,
      } as ProviderProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching provider profile from Firestore (Admin SDK):', error);
    throw new Error('Could not fetch provider profile.');
  }
}


/**
 * Retrieves provider profiles by service category using Admin SDK.
 * @param serviceCategory - The service category to filter by.
 * @returns A promise that resolves with an array of ProviderProfile objects.
 */
export async function getProvidersByServiceFromFirestore(serviceCategory: ServiceCategory): Promise<ProviderProfile[]> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch providers by service.");
    return [];
  }
  try {
    const profilesRef = adminDb.collection('providerProfiles');
    const q = profilesRef.where('mainService', '==', serviceCategory).where('isVerified', '==', true);
    const querySnapshot = await q.get();
    const providers: ProviderProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()!;
       const certifications = (Array.isArray(data.certifications) ? data.certifications : []).map(cert => ({
          ...cert,
          id: cert.id || '',
          name: cert.name || '',
          number: cert.number || '',
          issuingBody: cert.issuingBody || '',
          documentUrl: cert.documentUrl || null,
          status: cert.status || 'pending_review',
          verificationNotes: cert.verificationNotes || null,
          issueDate: robustTimestampToDate(cert.issueDate, null),
          expiryDate: robustTimestampToDate(cert.expiryDate, null),
      } as Certification));
      
      const portfolio = (Array.isArray(data.portfolio) ? data.portfolio : []).map(item => ({
          id: item.id || '',
          imageUrl: item.imageUrl || '',
          description: item.description || '',
          dataAiHint: item.dataAiHint,
      } as PortfolioItem));

      providers.push({
        id: docSnap.id,
        userId: data.userId || '',
        businessName: data.businessName || 'N/A',
        mainService: data.mainService || 'Other',
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        bio: data.bio || '',
        location: data.location || 'N/A',
        fullAddress: data.fullAddress,
        yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : 0,
        isVerified: !!data.isVerified,
        verificationAuthority: data.verificationAuthority,
        portfolio,
        rating: typeof data.rating === 'number' ? data.rating : 0,
        reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 0,
        contactPhoneNumber: data.contactPhoneNumber || '',
        operatingHours: data.operatingHours,
        serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : [],
        profilePictureUrl: data.profilePictureUrl,
        bannerImageUrl: data.bannerImageUrl,
        website: data.website,
        socialMediaLinks: typeof data.socialMediaLinks === 'object' && data.socialMediaLinks !== null ? data.socialMediaLinks : undefined,
        createdAt: robustTimestampToDate(data.createdAt, new Date())!,
        updatedAt: robustTimestampToDate(data.updatedAt, new Date())!,
        certifications,
      } as ProviderProfile);
    });
    return providers;
  } catch (error) {
    console.error('Error fetching providers by service (Admin SDK):', error);
    throw new Error('Could not fetch providers by service.');
  }
}

/**
 * Updates a provider's profile picture URL using Admin SDK.
 * @param providerId - The provider's unique ID.
 * @param newPhotoURL - The new URL of the profile picture.
 */
export async function updateProviderPhotoURL(providerId: string, newPhotoURL: string): Promise<void> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot update provider photo URL.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const providerRef = adminDb.collection('providerProfiles').doc(providerId);
    const updatePayload: UpdateData<ProviderProfile> = {
      profilePictureUrl: newPhotoURL,
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };
    await providerRef.update(updatePayload);
  } catch (error) {
    console.error('Error updating provider photo URL (Admin SDK):', error);
    throw new Error('Could not update provider photo URL.');
  }
}
