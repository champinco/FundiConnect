
'use server';

import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint, FieldPath } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';

export interface SearchParams {
  query?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  minRating?: number | null;
  verifiedOnly?: boolean | null;
}

export async function searchProvidersAction(params: SearchParams): Promise<Provider[]> {
  try {
    const providersRef = collection(db, 'providerProfiles');
    const queryConstraints: QueryConstraint[] = [];

    // Category filter
    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('mainService', '==', params.category));
    }

    // Verified only filter
    if (params.verifiedOnly === true) {
      queryConstraints.push(where('isVerified', '==', true));
    }

    // Location filter - check if provided location is in the provider's serviceAreas array
    // Firestore's array-contains is case-sensitive. Providers should be guided to enter consistent data.
    if (params.location && params.location.trim() !== '') {
      // To make it slightly more robust for user input, we can try matching common casings.
      // However, true case-insensitivity for array-contains requires storing lowercase arrays.
      // For MVP, we'll use the trimmed input directly.
      const locationSearchTerm = params.location.trim();
      queryConstraints.push(where('serviceAreas', 'array-contains', locationSearchTerm));
    }
    
    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(where('rating', '>=', params.minRating));
       if (!queryConstraints.some(c => {
            const fieldPath = (c as any)._fieldPath; // internal field, use with caution
            return fieldPath && fieldPath.isEqual(new FieldPath('rating'));
        })) {
         queryConstraints.push(orderBy('rating', 'desc'));
      }
    }

    if (!queryConstraints.some(c => c.toString().includes("orderBy"))) {
        queryConstraints.push(orderBy('businessName')); 
    }
    
    queryConstraints.push(limit(50)); 

    const firestoreQuery = query(providersRef, ...queryConstraints);
    
    const querySnapshot = await getDocs(firestoreQuery);
    let providersData: Provider[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ProviderProfile;
      providersData.push({
        id: doc.id,
        name: data.businessName,
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/600x400.png',
        rating: data.rating || 0,
        reviewsCount: data.reviewsCount || 0,
        location: data.location, // Primary location for display
        mainService: data.mainService,
        isVerified: data.isVerified || false,
        verificationAuthority: data.verificationAuthority,
        bioSummary: data.bio ? (data.bio.substring(0, 100) + (data.bio.length > 150 ? '...' : '')) : 'No bio available.',
      });
    });

    // Text query is still applied post-fetch.
    // Consider if the text query should also check against serviceAreas for better relevance.
    if (params.query && params.query.trim() !== '') {
      const searchTerm = params.query.trim().toLowerCase();
      providersData = providersData.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.mainService.toLowerCase().includes(searchTerm) ||
        (p.bioSummary && p.bioSummary.toLowerCase().includes(searchTerm)) ||
        (p.location && p.location.toLowerCase().includes(searchTerm)) 
      );
    }

    return providersData;
  } catch (error) {
    console.error("Error searching providers:", error);
    return []; 
  }
}
