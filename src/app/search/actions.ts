
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
// Changed from named imports to namespace import
import * as adminFirestore from 'firebase-admin/firestore';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job, JobStatus } from '@/models/job';
import type { JobCardProps } from '@/components/job-card';

// Initial diagnostic log at module load
console.log('[search/actions.ts] Module loaded. Verifying top-level Firestore imports:');
console.log('typeof adminDb (at module load):', typeof adminDb);
console.log('typeof adminFirestore (at module load):', typeof adminFirestore); // Check the namespace itself
console.log('typeof adminFirestore?.collection:', typeof adminFirestore?.collection);
console.log('typeof adminFirestore?.query:', typeof adminFirestore?.query);
console.log('typeof adminFirestore?.where:', typeof adminFirestore?.where);
console.log('typeof adminFirestore?.orderBy:', typeof adminFirestore?.orderBy);
console.log('typeof adminFirestore?.limit:', typeof adminFirestore?.limit);
console.log('typeof adminFirestore?.getDocs:', typeof adminFirestore?.getDocs);
console.log('typeof adminFirestore?.FieldPath:', typeof adminFirestore?.FieldPath);
console.log('typeof adminFirestore?.Timestamp:', typeof adminFirestore?.Timestamp);


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
  console.log('typeof adminFirestore?.collection:', typeof adminFirestore?.collection);
  console.log('typeof adminFirestore?.query:', typeof adminFirestore?.query);
  console.log('typeof adminFirestore?.where:', typeof adminFirestore?.where);
  console.log('typeof adminFirestore?.orderBy:', typeof adminFirestore?.orderBy);
  console.log('typeof adminFirestore?.limit:', typeof adminFirestore?.limit);


  if (!adminDb) {
    console.error("[searchProvidersAction] CRITICAL: adminDb is not initialized at the time of action execution.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }
  if (typeof adminFirestore?.collection !== 'function' || typeof adminFirestore?.query !== 'function' || typeof adminFirestore?.where !== 'function' || typeof adminFirestore?.orderBy !== 'function' || typeof adminFirestore?.limit !== 'function') {
    console.error("[searchProvidersAction] CRITICAL: One or more Firestore functions are not correctly imported or available.");
    throw new Error("Server error: Core database functions are missing. Please try again later.");
  }

  try {
    const providersRef = adminFirestore.collection(adminDb, 'providerProfiles');
    const queryConstraints: adminFirestore.QueryConstraint[] = [];

    if (params.category && params.category !== 'All') {
      queryConstraints.push(adminFirestore.where('mainService', '==', params.category));
    }

    if (params.verifiedOnly === true) {
      queryConstraints.push(adminFirestore.where('isVerified', '==', true));
    }

    if (params.location && params.location.trim() !== '') {
      const locationSearchTerm = params.location.trim();
      queryConstraints.push(adminFirestore.where('location', '>=', locationSearchTerm));
      queryConstraints.push(adminFirestore.where('location', '<=', locationSearchTerm + '\uf8ff'));
    }

    if (params.minRating && params.minRating > 0) {
      queryConstraints.push(adminFirestore.where('rating', '>=', params.minRating));
      if (!queryConstraints.some(c => (c as any)._fieldPath?.isEqual?.(new adminFirestore.FieldPath('rating')) && (c as any)._op === 'orderBy')) {
        queryConstraints.push(adminFirestore.orderBy('rating', 'desc'));
      }
    }

    if (!queryConstraints.some(c => (c as any)._fieldPath?.isEqual?.(new adminFirestore.FieldPath('rating')) || (c as any)._fieldPath?.isEqual?.(new adminFirestore.FieldPath('businessName')))) {
      queryConstraints.push(adminFirestore.orderBy('businessName')); 
    }

    queryConstraints.push(adminFirestore.limit(50));

    const firestoreQuery = adminFirestore.query(providersRef, ...queryConstraints);
    console.log('[searchProvidersAction] Executing Firestore query for providers.');
    const querySnapshot = await adminFirestore.getDocs(firestoreQuery);
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

    if (params.query && params.query.trim() !== '') {
      const searchTerm = params.query.trim().toLowerCase();
      providersData = providersData.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.mainService.toLowerCase().includes(searchTerm) ||
        (p.bioSummary && p.bioSummary.toLowerCase().includes(searchTerm)) ||
        (p.location && p.location.toLowerCase().includes(searchTerm))
      );
    }
    console.log(`[searchProvidersAction] Found ${providersData.length} providers.`);
    return providersData;
  } catch (error: any) {
    console.error("[searchProvidersAction] Error during provider search. Details:", error.message, error.stack);
    if (error.errorInfo) console.error("Firebase Extended Error Info:", error.errorInfo);
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
  console.log('typeof adminFirestore?.collection:', typeof adminFirestore?.collection);
  console.log('typeof adminFirestore?.query:', typeof adminFirestore?.query);
  console.log('typeof adminFirestore?.where:', typeof adminFirestore?.where);
  console.log('typeof adminFirestore?.orderBy:', typeof adminFirestore?.orderBy);
  console.log('typeof adminFirestore?.limit:', typeof adminFirestore?.limit);


  if (!adminDb) {
    console.error("[searchJobsAction] CRITICAL: adminDb is not initialized at the time of action execution.");
    throw new Error("Server error: Database service is not available. Please try again later.");
  }
  if (typeof adminFirestore?.collection !== 'function' || typeof adminFirestore?.query !== 'function' || typeof adminFirestore?.where !== 'function' || typeof adminFirestore?.orderBy !== 'function' || typeof adminFirestore?.limit !== 'function') {
    console.error("[searchJobsAction] CRITICAL: One or more Firestore functions are not correctly imported or available.");
    throw new Error("Server error: Core database functions are missing. Please try again later.");
  }

  if (params.isMyJobsSearch && !params.currentUserId) {
    console.warn("[searchJobsAction] 'myJobs' search initiated without a currentUserId. Returning empty results.");
    return [];
  }

  try {
    const jobsCollectionRef = adminFirestore.collection(adminDb, 'jobs');
    const queryConstraints: adminFirestore.QueryConstraint[] = [];

    if (params.isMyJobsSearch && params.currentUserId) {
      queryConstraints.push(adminFirestore.where('clientId', '==', params.currentUserId));
      if (params.filterByStatus && params.filterByStatus !== 'all_my') {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          queryConstraints.push(adminFirestore.where('status', 'in', params.filterByStatus));
        } else if (typeof params.filterByStatus === 'string') {
          queryConstraints.push(adminFirestore.where('status', '==', params.filterByStatus as JobStatus));
        }
      }
    } else {
      queryConstraints.push(adminFirestore.where('status', 'in', ['open', 'pending_quotes']));
    }

    if (params.category && params.category !== 'All') {
      queryConstraints.push(adminFirestore.where('serviceCategory', '==', params.category));
    }
    
    if (params.location && params.location.trim() !== '') {
        const locationTerm = params.location.trim();
        queryConstraints.push(adminFirestore.where('location', '>=', locationTerm));
        queryConstraints.push(adminFirestore.where('location', '<=', locationTerm + '\uf8ff'));
    }

    queryConstraints.push(adminFirestore.orderBy('postedAt', 'desc'));
    queryConstraints.push(adminFirestore.limit(50));

    const firestoreQuery = adminFirestore.query(jobsCollectionRef, ...queryConstraints);
    console.log('[searchJobsAction] Executing Firestore query for jobs.');
    const querySnapshot = await adminFirestore.getDocs(firestoreQuery);

    let jobsData: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postedAt = (data.postedAt as adminFirestore.Timestamp)?.toDate();
      const updatedAt = (data.updatedAt as adminFirestore.Timestamp)?.toDate();
      const deadline = data.deadline ? (data.deadline as adminFirestore.Timestamp).toDate() : null;

      jobsData.push({
        id: docSnap.id,
        ...data,
        postedAt,
        updatedAt,
        deadline,
      } as Job);
    });

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
    console.log(`[searchJobsAction] Found ${jobCardData.length} jobs.`);
    return jobCardData;

  } catch (error: any) {
    console.error("[searchJobsAction] Error during job search. Details:", error.message, error.stack);
    if (error.errorInfo) console.error("Firebase Extended Error Info:", error.errorInfo);
    throw new Error("An error occurred while searching for jobs. Please try again.");
  }
}
    
