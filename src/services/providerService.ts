
/**
 * @fileOverview Service functions for interacting with provider profile data in Firestore.
 */
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { adminDb, AdminTimestamp, AdminFieldValue } from '@/lib/firebaseAdmin'; // Use Admin SDK
import type { ProviderProfile, Certification } from '@/models/provider';
import type { ServiceCategory } from '@/components/service-category-icon';

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
    const profileRef = doc(adminDb, 'providerProfiles', profileData.id);
    const now = AdminFieldValue.serverTimestamp();
    
    const certificationsWithAdminTimestamps = profileData.certifications.map(cert => ({
      ...cert,
      issueDate: cert.issueDate ? AdminTimestamp.fromDate(new Date(cert.issueDate)) : null,
      expiryDate: cert.expiryDate ? AdminTimestamp.fromDate(new Date(cert.expiryDate)) : null,
    }));

    await setDoc(profileRef, {
      ...profileData,
      certifications: certificationsWithAdminTimestamps,
      rating: 0,
      reviewsCount: 0,
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
    // Decide on behavior: throw error or return null gracefully?
    // For reads, returning null might be acceptable if UI can handle it.
    // throw new Error("Server error: Admin DB not initialized.");
    return null; 
  }
  try {
    const profileRef = doc(adminDb, 'providerProfiles', providerId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data() as Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'certifications'> & {
          createdAt: admin.firestore.Timestamp;
          updatedAt: admin.firestore.Timestamp;
          certifications: Array<Omit<Certification, 'issueDate' | 'expiryDate'> & { issueDate?: admin.firestore.Timestamp | null, expiryDate?: admin.firestore.Timestamp | null }>;
      };
      
      const certifications = (profileData.certifications || []).map(cert => ({
          ...cert,
          issueDate: cert.issueDate ? (cert.issueDate as unknown as AdminTimestamp).toDate() : null,
          expiryDate: cert.expiryDate ? (cert.expiryDate as unknown as AdminTimestamp).toDate() : null,
      }));

      return {
        ...profileData,
        id: profileSnap.id, // Ensure id is included
        createdAt: (profileData.createdAt as AdminTimestamp)?.toDate(),
        updatedAt: (profileData.updatedAt as AdminTimestamp)?.toDate(),
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
    const profilesRef = collection(adminDb, 'providerProfiles');
    const q = query(profilesRef, where('mainService', '==', serviceCategory), where('isVerified', '==', true));
    const querySnapshot = await getDocs(q);
    const providers: ProviderProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const profileData = docSnap.data();
      providers.push({
        ...profileData,
        id: docSnap.id,
        createdAt: (profileData.createdAt as AdminTimestamp)?.toDate(),
        updatedAt: (profileData.updatedAt as AdminTimestamp)?.toDate(),
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
    const providerRef = doc(adminDb, 'providerProfiles', providerId);
    await updateDoc(providerRef, {
      profilePictureUrl: newPhotoURL,
      updatedAt: AdminFieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating provider photo URL (Admin SDK):', error);
    throw new Error('Could not update provider photo URL.');
  }
}
