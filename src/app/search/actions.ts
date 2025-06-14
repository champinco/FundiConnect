
'use server';

import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint, FieldPath } from 'firebase-admin/firestore'; // Ensure FieldPath is imported for Admin SDK
import { adminDb } from '@/lib/firebaseAdmin';
import type { Timestamp } from 'firebase-admin/firestore';
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
    console.error("[searchProvidersAction] CRITICAL: Admin DB not initialized. Aborting search.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }

  try {
    const providersRef = adminDb.collection('providerProfiles');
    const queryConstraints: QueryConstraint[] = [];

    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('mainService', '==', params.category));
    }

    if (params.verifiedOnly === true) {
      queryConstraints.push(where('isVerified', '==', true));
    }

    if (params.location && params.location.trim() !== '') {
      const locationSearchTerm = params.location.trim();
      queryConstraints.push(where('serviceAreas', 'array-contains', locationSearchTerm));
    }

    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(where('rating', '>=', params.minRating));
      if (!queryConstraints.some(c => {
            const constraint = c as any; // Type assertion to access internal-like properties
            return constraint._fieldPath && constraint._fieldPath.isEqual(new FieldPath('rating'));
        })) {
        queryConstraints.push(orderBy('rating', 'desc'));
      }
    }

    // Default sort order if no rating sort is applied
    if (!queryConstraints.some(c => {
        const constraint = c as any;
        const fieldPath = constraint._fieldPath;
        return fieldPath && (fieldPath.isEqual(new FieldPath('rating')) || fieldPath.isEqual(new FieldPath('businessName')))
    })) {
        queryConstraints.push(orderBy('businessName'));
    }

    queryConstraints.push(limit(50));

    const firestoreQuery = query(providersRef, ...queryConstraints);
    const querySnapshot = await firestoreQuery.get();
    let providersData: Provider[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ProviderProfile; // Assume data conforms to ProviderProfile
      providersData.push({
        id: doc.id,
        name: data.businessName, // Required in ProviderProfile
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/600x400.png',
        rating: data.rating || 0,
        reviewsCount: data.reviewsCount || 0,
        location: data.location, // Required in ProviderProfile
        mainService: data.mainService, // Required in ProviderProfile
        isVerified: data.isVerified || false,
        verificationAuthority: data.verificationAuthority,
        bioSummary: data.bio ? (data.bio.substring(0, 100) + (data.bio.length > 150 ? '...' : '')) : 'No bio available.',
      });
    });

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
  } catch (error: any) {
    console.error("[searchProvidersAction] Error during provider search:", error);
    // Log the specific error for server-side debugging
    // Re-throw a more generic error to the client
    throw new Error("An error occurred while searching for providers. Please try again.");
  }
}

export interface JobSearchParams {
  keywords?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  currentUserId?: string | null;
  filterByStatus?: JobStatus | JobStatus[] | string | null;
  isMyJobsSearch?: boolean;
}

export async function searchJobsAction(params: JobSearchParams): Promise<JobCardProps['job'][]> {
  if (!adminDb) {
    console.error("[searchJobsAction] CRITICAL: Admin DB not initialized. Aborting search.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }

  try {
    const jobsRef = adminDb.collection('jobs');
    const queryConstraints: QueryConstraint[] = [];

    if (params.isMyJobsSearch) {
      if (!params.currentUserId) {
        console.warn("[searchJobsAction] 'myJobs' search initiated without a currentUserId. Returning empty results.");
        return [];
      }
      queryConstraints.push(where('clientId', '==', params.currentUserId));

      if (params.filterByStatus && params.filterByStatus !== 'all_my') {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          queryConstraints.push(where('status', 'in', params.filterByStatus));
        } else if (typeof params.filterByStatus === 'string') {
          queryConstraints.push(where('status', '==', params.filterByStatus));
        }
      } else if (params.filterByStatus === null || params.filterByStatus === undefined) {
        // Default active statuses for "my jobs" if no specific status filter is applied
        queryConstraints.push(where('status', 'in', ['open', 'pending_quotes', 'assigned', 'in_progress', 'completed']));
      }
      // If params.filterByStatus === 'all_my', no additional status constraint is added for 'my jobs'.
    } else {
      // Default behavior for general job search: only open or pending_quotes
      queryConstraints.push(where('status', 'in', ['open', 'pending_quotes']));
    }

    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('serviceCategory', '==', params.category));
    }

    queryConstraints.push(orderBy('postedAt', 'desc'));
    queryConstraints.push(limit(50));

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

    if (params.location && params.location.trim() !== '') {
      const locationTerm = params.location.trim().toLowerCase();
      jobsData = jobsData.filter(job => job.location && job.location.toLowerCase().includes(locationTerm));
    }

    if (params.keywords && params.keywords.trim() !== '') {
      const keywordTerm = params.keywords.trim().toLowerCase();
      jobsData = jobsData.filter(job =>
        (job.title && job.title.toLowerCase().includes(keywordTerm)) ||
        (job.description && job.description.toLowerCase().includes(keywordTerm))
      );
    }

    const jobCardData: JobCardProps['job'][] = jobsData.map(job => ({
      id: job.id,
      title: job.title,
      serviceCategory: job.serviceCategory,
      otherCategoryDescription: job.otherCategoryDescription,
      location: job.location,
      postedAt: job.postedAt,
      status: job.status,
      description: job.description,
    }));

    return jobCardData;

  } catch (error: any) {
    console.error("[searchJobsAction] Error during job search:", error);
    // Log the specific error for server-side debugging
    // Re-throw a more generic error to the client
    throw new Error("An error occurred while searching for jobs. Please try again.");
  }
}
