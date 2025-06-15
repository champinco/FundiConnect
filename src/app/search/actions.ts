
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  type QueryConstraint,
  FieldPath,
  Timestamp as AdminTimestamp
} from 'firebase-admin/firestore';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job, JobStatus } from '@/models/job';
import type { JobCardProps } from '@/components/job-card';

console.log('[search/actions.ts] Module loaded. Verifying top-level Firestore imports:');
console.log('typeof adminDb (at module load):', typeof adminDb); // adminDb might be null here if firebaseAdmin hasn't run yet
console.log('typeof collection (from firebase-admin/firestore):', typeof collection);
console.log('typeof query (from firebase-admin/firestore):', typeof query);
console.log('typeof where (from firebase-admin/firestore):', typeof where);
console.log('typeof orderBy (from firebase-admin/firestore):', typeof orderBy);
console.log('typeof limit (from firebase-admin/firestore):', typeof limit);
console.log('typeof getDocs (from firebase-admin/firestore):', typeof getDocs);

export interface SearchParams {
  query?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  minRating?: number | null;
  verifiedOnly?: boolean | null;
}

export async function searchProvidersAction(params: SearchParams): Promise<Provider[]> {
  console.log('[searchProvidersAction] Initiated with params:', JSON.stringify(params));
  console.log('[searchProvidersAction] Verifying imports inside action:');
  console.log('typeof adminDb:', typeof adminDb, adminDb ? 'exists' : 'null or undefined');
  console.log('typeof collection:', typeof collection);
  console.log('typeof query:', typeof query);
  console.log('typeof where:', typeof where);
  console.log('typeof orderBy:', typeof orderBy);
  console.log('typeof limit:', typeof limit);

  if (!adminDb) {
    console.error("[searchProvidersAction] CRITICAL: adminDb is not initialized at the time of action execution.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }
  if (typeof collection !== 'function' || typeof query !== 'function' || typeof where !== 'function' || typeof orderBy !== 'function' || typeof limit !== 'function') {
    console.error("[searchProvidersAction] CRITICAL: One or more Firestore functions are not correctly imported or available.");
    throw new Error("Server error: Core database functions are missing. Please try again later.");
  }

  try {
    const providersRef = collection(adminDb, 'providerProfiles');
    const queryConstraints: QueryConstraint[] = [];

    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('mainService', '==', params.category));
    }

    if (params.verifiedOnly === true) {
      queryConstraints.push(where('isVerified', '==', true));
    }

    if (params.location && params.location.trim() !== '') {
      const locationSearchTerm = params.location.trim();
      // Assuming location is a string field. For array contains, use:
      // queryConstraints.push(where('serviceAreas', 'array-contains', locationSearchTerm));
      // For now, let's assume simple string equality or prefix for 'location' if it's not an array.
      // This part might need adjustment based on actual 'location' field structure.
      // For simplicity, if 'location' is a primary field like 'city', this might be:
      queryConstraints.push(where('location', '>=', locationSearchTerm));
      queryConstraints.push(where('location', '<=', locationSearchTerm + '\uf8ff'));
    }

    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(where('rating', '>=', params.minRating));
      // Ensure orderBy rating is only added if not already sorting by something else that takes precedence
      if (!queryConstraints.some(c => (c as any)._fieldPath?.isEqual?.(new FieldPath('rating')) && (c as any)._op === 'orderBy')) {
        queryConstraints.push(orderBy('rating', 'desc'));
      }
    }

    if (!queryConstraints.some(c => (c as any)._fieldPath?.isEqual?.(new FieldPath('rating')) || (c as any)._fieldPath?.isEqual?.(new FieldPath('businessName')))) {
      queryConstraints.push(orderBy('businessName')); // Default sort
    }

    queryConstraints.push(limit(50));

    const firestoreQuery = query(providersRef, ...queryConstraints);
    console.log('[searchProvidersAction] Executing Firestore query for providers.');
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
        location: data.location, // Make sure this field exists and is a string
        mainService: data.mainService,
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
        (p.location && p.location.toLowerCase().includes(searchTerm)) // Ensure p.location is string
      );
    }
    console.log(`[searchProvidersAction] Found ${providersData.length} providers.`);
    return providersData;
  } catch (error: any) {
    console.error("[searchProvidersAction] Error during provider search. Details:", error.message, error.stack);
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
  console.log('[searchJobsAction] Initiated with params:', JSON.stringify(params));
  console.log('[searchJobsAction] Verifying imports inside action:');
  console.log('typeof adminDb:', typeof adminDb, adminDb ? 'exists' : 'null or undefined');
  console.log('typeof collection:', typeof collection);
  console.log('typeof query:', typeof query);
  console.log('typeof where:', typeof where);
  console.log('typeof orderBy:', typeof orderBy);
  console.log('typeof limit:', typeof limit);

  if (!adminDb) {
    console.error("[searchJobsAction] CRITICAL: adminDb is not initialized at the time of action execution.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }
  if (typeof collection !== 'function' || typeof query !== 'function' || typeof where !== 'function' || typeof orderBy !== 'function' || typeof limit !== 'function') {
    console.error("[searchJobsAction] CRITICAL: One or more Firestore functions are not correctly imported or available.");
    throw new Error("Server error: Core database functions are missing. Please try again later.");
  }


  if (params.isMyJobsSearch && !params.currentUserId) {
    console.warn("[searchJobsAction] 'myJobs' search initiated without a currentUserId. Returning empty results.");
    return [];
  }

  try {
    const jobsCollectionRef = collection(adminDb, 'jobs');
    const queryConstraints: QueryConstraint[] = [];

    if (params.isMyJobsSearch && params.currentUserId) {
      queryConstraints.push(where('clientId', '==', params.currentUserId));
      if (params.filterByStatus && params.filterByStatus !== 'all_my') {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          queryConstraints.push(where('status', 'in', params.filterByStatus));
        } else if (typeof params.filterByStatus === 'string') {
          queryConstraints.push(where('status', '==', params.filterByStatus));
        }
      } else if (!params.filterByStatus || params.filterByStatus !== 'all_my') {
        // Default active statuses if not 'all_my' and no specific status
         queryConstraints.push(where('status', 'in', ['open', 'pending_quotes', 'assigned', 'in_progress', 'completed']));
      }
      // If filterByStatus is 'all_my', no status filter is applied for this client.
    } else {
      // General provider job search
      queryConstraints.push(where('status', 'in', ['open', 'pending_quotes']));
    }

    if (params.category && params.category !== 'All') {
      queryConstraints.push(where('serviceCategory', '==', params.category));
    }

    queryConstraints.push(orderBy('postedAt', 'desc'));
    queryConstraints.push(limit(50));

    const firestoreQuery = query(jobsCollectionRef, ...queryConstraints);
    console.log('[searchJobsAction] Executing Firestore query for jobs.');
    const querySnapshot = await getDocs(firestoreQuery);

    let jobsData: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postedAt = (data.postedAt as AdminTimestamp)?.toDate();
      const updatedAt = (data.updatedAt as AdminTimestamp)?.toDate();
      const deadline = data.deadline ? (data.deadline as AdminTimestamp).toDate() : null;

      jobsData.push({
        id: docSnap.id,
        ...data,
        postedAt,
        updatedAt,
        deadline,
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
      description: job.description, // Ensure description is passed
    }));
    console.log(`[searchJobsAction] Found ${jobCardData.length} jobs.`);
    return jobCardData;

  } catch (error: any) {
    console.error("[searchJobsAction] Error during job search. Details:", error.message, error.stack);
    throw new Error("An error occurred while searching for jobs. Please try again.");
  }
}
    