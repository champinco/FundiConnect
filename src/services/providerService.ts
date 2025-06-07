
/**
 * @fileOverview Service functions for interacting with provider profile data in Firestore.
 */
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';
import type { ServiceCategory } from '@/components/service-category-icon';

/**
 * Creates or updates a provider profile document in Firestore.
 * @param profileData - The provider profile data. The ID should typically be the user's UID.
 * @returns A promise that resolves when the operation is complete.
 */
export async function createProviderProfileInFirestore(profileData: Omit<ProviderProfile, 'createdAt' | 'updatedAt' | 'rating' | 'reviewsCount'>): Promise<void> {
  try {
    const profileRef = doc(db, 'providerProfiles', profileData.id);
    const now = serverTimestamp();
    await setDoc(profileRef, {
      ...profileData,
      rating: 0, // Initial rating
      reviewsCount: 0, // Initial reviews count
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    console.error('Error creating provider profile in Firestore:', error);
    throw new Error('Could not create provider profile.');
  }
}

/**
 * Retrieves a provider profile document from Firestore.
 * @param providerId - The provider's unique ID (usually user UID).
 * @returns A promise that resolves with the ProviderProfile object or null if not found.
 */
export async function getProviderProfileFromFirestore(providerId: string): Promise<ProviderProfile | null> {
  try {
    const profileRef = doc(db, 'providerProfiles', providerId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      return {
        ...profileData,
        createdAt: (profileData.createdAt as Timestamp)?.toDate(),
        updatedAt: (profileData.updatedAt as Timestamp)?.toDate(),
        // Ensure certifications and portfolio items with dates are handled if they exist
      } as ProviderProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching provider profile from Firestore:', error);
    throw new Error('Could not fetch provider profile.');
  }
}

/**
 * Retrieves provider profiles by service category.
 * @param serviceCategory - The service category to filter by.
 * @returns A promise that resolves with an array of ProviderProfile objects.
 */
export async function getProvidersByServiceFromFirestore(serviceCategory: ServiceCategory): Promise<ProviderProfile[]> {
  try {
    const profilesRef = collection(db, 'providerProfiles');
    const q = query(profilesRef, where('mainService', '==', serviceCategory), where('isVerified', '==', true)); // Example: only verified
    const querySnapshot = await getDocs(q);
    const providers: ProviderProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const profileData = docSnap.data();
      providers.push({
        ...profileData,
        id: docSnap.id,
        createdAt: (profileData.createdAt as Timestamp)?.toDate(),
        updatedAt: (profileData.updatedAt as Timestamp)?.toDate(),
      } as ProviderProfile);
    });
    return providers;
  } catch (error) {
    console.error('Error fetching providers by service:', error);
    throw new Error('Could not fetch providers by service.');
  }
}
