
'use server';

import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint, FieldPath, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job, JobStatus } from '@/models/job'; // Import Job model
import type { JobCardProps } from '@/components/job-card'; // Import JobCardProps

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
    if (params.location && params.location.trim() !== '') {
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

    if (!queryConstraints.some(c => {
        const fieldPath = (c as any)._fieldPath;
        return fieldPath && (fieldPath.isEqual(new FieldPath('rating')) || fieldPath.isEqual(new FieldPath('businessName')))
    })) {
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
  filterByStatus?: JobStatus | JobStatus[] | null; 
  isMyJobsSearch?: boolean; 
}

export async function searchJobsAction(params: JobSearchParams): Promise<JobCardProps['job'][]> {
  try {
    const jobsRef = collection(db, 'jobs');
    const queryConstraints: QueryConstraint[] = [];

    if (params.isMyJobsSearch && params.currentUserId) {
      queryConstraints.push(where('clientId', '==', params.currentUserId));
      if (params.filterByStatus) {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          queryConstraints.push(where('status', 'in', params.filterByStatus));
        } else if (typeof params.filterByStatus === 'string') {
          queryConstraints.push(where('status', '==', params.filterByStatus));
        }
        // If filterByStatus is an empty array or null/undefined, we show relevant active statuses for "my jobs"
        else {
             queryConstraints.push(where('status', 'in', ['open', 'pending_quotes', 'assigned', 'in_progress']));
        }
      } else {
        // Default statuses for "my jobs" if no specific status filter is applied
        queryConstraints.push(where('status', 'in', ['open', 'pending_quotes', 'assigned', 'in_progress', 'completed']));
      }
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
    const querySnapshot = await getDocs(firestoreQuery);
    
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
    // This applies after initial DB query, useful if DB query for location is broad or not used.
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
      description: job.description, // Pass full description for snippet logic in card
    }));

    return jobCardData;

  } catch (error) {
    console.error("Error searching jobs:", error);
    return [];
  }
}
