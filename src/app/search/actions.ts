
'use server';

import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint, FieldPath } from 'firebase-admin/firestore'; // Ensure FieldPath is imported for Admin SDK
import { adminDb } from '@/lib/firebaseAdmin'; // Use adminDb
import type { Timestamp } from 'firebase-admin/firestore'; // Import Timestamp for type checking
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job, JobStatus } from '@/models/job'; 
import type { JobCardProps } from '@/components/job-card'; 

export interface SearchParams {
  query?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  minRating?: number | null;
  verifiedOnly?: boolean | null;
}

export async function searchProvidersAction(params: SearchParams): Promise<Provider[]> {
  if (!adminDb) {
    console.error("[searchProvidersAction] Admin DB not initialized.");
    throw new Error("Server error: Database not available.");
  }
  try {
    const providersRef = adminDb.collection('providerProfiles');
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
    if (params.location && params.location.trim() !== '') {
      const locationSearchTerm = params.location.trim();
      queryConstraints.push(where('serviceAreas', 'array-contains', locationSearchTerm));
    }
    
    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(where('rating', '>=', params.minRating));
       if (!queryConstraints.some(c => {
            // This check is a bit tricky with Admin SDK types.
            // We assume if a 'rating' where clause exists, an orderBy on rating is also implicitly handled or added.
            // For explicit ordering when minRating is present:
            return (c as any)._fieldPath && (c as any)._fieldPath.isEqual(new FieldPath('rating'));

        })) {
         queryConstraints.push(orderBy('rating', 'desc'));
      }
    }

    if (!queryConstraints.some(c => {
        const fieldPath = (c as any)._fieldPath;
        return fieldPath && (fieldPath.isEqual(new FieldPath('rating')) || fieldPath.isEqual(new FieldPath('businessName')))
    })) {
        queryConstraints.push(orderBy('businessName')); 
    }
    
    queryConstraints.push(limit(50)); 

    const firestoreQuery = query(providersRef, ...queryConstraints);
    
    const querySnapshot = await firestoreQuery.get();
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

    // Text query is still applied post-fetch for providers.
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


// New action for searching jobs
export interface JobSearchParams {
  keywords?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  currentUserId?: string | null; 
  filterByStatus?: JobStatus | JobStatus[] | string | null; // Allow 'all_my' as string
  isMyJobsSearch?: boolean; 
}

export async function searchJobsAction(params: JobSearchParams): Promise<JobCardProps['job'][]> {
  if (!adminDb) {
    console.error("[searchJobsAction] Admin DB not initialized.");
    throw new Error("Server error: Database not available.");
  }
  try {
    const jobsRef = adminDb.collection('jobs');
    const queryConstraints: QueryConstraint[] = [];

    if (params.isMyJobsSearch && params.currentUserId) {
      queryConstraints.push(where('clientId', '==', params.currentUserId));
      
      if (params.filterByStatus && params.filterByStatus !== 'all_my') {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          queryConstraints.push(where('status', 'in', params.filterByStatus));
        } else if (typeof params.filterByStatus === 'string') {
          queryConstraints.push(where('status', '==', params.filterByStatus));
        }
      } else if (!params.filterByStatus) { // No status filter provided for "my jobs", use default active list
        queryConstraints.push(where('status', 'in', ['open', 'pending_quotes', 'assigned', 'in_progress', 'completed']));
      }
      // If params.filterByStatus === 'all_my', no additional status constraint is added.
    } else {
      // Default behavior for general job search: only open or pending_quotes
      queryConstraints.push(where('status', 'in', ['open', 'pending_quotes']));
    }

    // Category filter (applies to both general and "my jobs" search if provided)
    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('serviceCategory', '==', params.category));
    }
    
    queryConstraints.push(orderBy('postedAt', 'desc'));
    queryConstraints.push(limit(50)); // Limit results

    const firestoreQuery = query(jobsRef, ...queryConstraints);
    const querySnapshot = await firestoreQuery.get();
    
    let jobsData: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      jobsData.push({
        id: docSnap.id,
        ...data,
        postedAt: (data.postedAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        deadline: (data.deadline as Timestamp)?.toDate() || null,
      } as Job);
    });

    // Client-side filtering for location (case-insensitive partial match)
    if (params.location && params.location.trim() !== '') {
      const locationTerm = params.location.trim().toLowerCase();
      jobsData = jobsData.filter(job => job.location.toLowerCase().includes(locationTerm));
    }
    
    // Client-side filtering for keywords (title and description)
    if (params.keywords && params.keywords.trim() !== '') {
      const keywordTerm = params.keywords.trim().toLowerCase();
      jobsData = jobsData.filter(job => 
        job.title.toLowerCase().includes(keywordTerm) ||
        job.description.toLowerCase().includes(keywordTerm)
      );
    }
    
    // Transform to JobCardProps['job']
    const jobCardData: JobCardProps['job'][] = jobsData.map(job => ({
      id: job.id,
      title: job.title,
      serviceCategory: job.serviceCategory,
      otherCategoryDescription: job.otherCategoryDescription,
      location: job.location,
      postedAt: job.postedAt, // Will be a Date object
      status: job.status,
      description: job.description, 
    }));

    return jobCardData;

  } catch (error) {
    console.error("Error searching jobs:", error);
    return [];
  }
}
