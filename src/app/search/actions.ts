
'use server';

import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint } from 'firebase/firestore';
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

    // Location filter - Exact match (case-sensitive by default in Firestore)
    // For case-insensitive, you would typically store a lowercase version of location and query that.
    if (params.location && params.location.trim() !== '') {
      queryConstraints.push(where('location', '==', params.location.trim()));
    }
    
    // Rating filter
    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(where('rating', '>=', params.minRating));
      // Firestore requires an orderBy clause on the field used in a range filter (like '>=')
      // if no other orderBy on that field is present.
      // If multiple orderBys are needed (e.g. rating desc, then name asc), ensure composite indexes.
      if (!queryConstraints.some(c => c.toString().includes('orderBy("rating"'))) {
         queryConstraints.push(orderBy('rating', 'desc'));
      }
    }

    // Default ordering if no specific sort is implied by filters (e.g. by rating)
    // Add a general sort to ensure somewhat consistent results if no rating filter applied.
    // Firestore requires an orderBy on a field if you use cursors or certain complex queries,
    // or if you want consistent pagination.
    if (!queryConstraints.some(c => c.toString().includes("orderBy"))) {
        queryConstraints.push(orderBy('businessName')); // Default sort by business name
    }
    
    // Limit the number of documents fetched
    queryConstraints.push(limit(50)); // Adjust limit as needed

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
        location: data.location,
        mainService: data.mainService,
        isVerified: data.isVerified || false,
        verificationAuthority: data.verificationAuthority,
        bioSummary: data.bio ? (data.bio.substring(0, 100) + (data.bio.length > 150 ? '...' : '')) : 'No bio available.',
      });
    });

    // If a text query is provided, filter the results from Firestore in the action.
    // This is a client-side style filter but performed on the server after DB fetch.
    if (params.query && params.query.trim() !== '') {
      const searchTerm = params.query.trim().toLowerCase();
      providersData = providersData.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.mainService.toLowerCase().includes(searchTerm) ||
        (p.bioSummary && p.bioSummary.toLowerCase().includes(searchTerm)) ||
        (p.location && p.location.toLowerCase().includes(searchTerm)) // also search location text
      );
    }

    return providersData;
  } catch (error) {
    console.error("Error searching providers:", error);
    return []; // Return empty array on error to prevent UI breakage
  }
}
