
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { Timestamp, FieldPath, Query as AdminQuery } from 'firebase-admin/firestore';
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
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[searchProvidersAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot search providers.");
  }
  console.log('[searchProvidersAction] Initiated with params:', JSON.stringify(params));
  
  try {
    let providerQuery: AdminQuery<FirebaseFirestore.DocumentData> = adminDb.collection('providerProfiles');

    if (params.category && params.category !== 'All') {
      console.log(`[searchProvidersAction] Applying category filter: ${params.category}`);
      providerQuery = providerQuery.where('mainService', '==', params.category);
    }

    if (params.verifiedOnly === true) {
      console.log(`[searchProvidersAction] Applying verifiedOnly filter`);
      providerQuery = providerQuery.where('isVerified', '==', true);
    }

    if (params.location && params.location.trim() !== '') {
      const locationSearchTerm = params.location.trim();
      console.log(`[searchProvidersAction] Applying location filter: >= ${locationSearchTerm}, <= ${locationSearchTerm}\\uf8ff`);
      providerQuery = providerQuery.where('location', '>=', locationSearchTerm)
                                   .where('location', '<=', locationSearchTerm + '\uf8ff');
    }

    let hasRatingOrder = false;
    if (params.minRating && params.minRating > 0) {
      console.log(`[searchProvidersAction] Applying minRating filter: >= ${params.minRating}`);
      providerQuery = providerQuery.where('rating', '>=', params.minRating);
      providerQuery = providerQuery.orderBy('rating', 'desc');
      hasRatingOrder = true;
    }

    if (!hasRatingOrder) {
      console.log(`[searchProvidersAction] Applying default order by businessName`);
      providerQuery = providerQuery.orderBy('businessName'); 
    }

    providerQuery = providerQuery.limit(50);

    console.log('[searchProvidersAction] Executing Firestore query for providers.');
    const querySnapshot = await providerQuery.get();
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
      console.log(`[searchProvidersAction] Applying client-side text filter: ${searchTerm}`);
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
    console.error(`[searchProvidersAction] Error during provider search. Params: ${JSON.stringify(params)}. Error:`, error.message, error.stack, error.code);
    if (error.message && error.message.includes('FAILED_PRECONDITION') && error.message.includes('index')) {
        console.error("[searchProvidersAction] Firestore query requires a composite index. The error message should contain a link to create it in the Firebase console.");
        throw new Error(`Query requires a Firestore index for providers. Check server logs for a link to create it. Original: ${error.message}`);
    }
    throw new Error(`An error occurred while searching for providers: ${error.message}.`);
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
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[searchJobsAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot search jobs.");
  }
  console.log('[searchJobsAction] Initiated with params:', JSON.stringify(params));

  if (params.isMyJobsSearch && !params.currentUserId) {
    console.warn("[searchJobsAction] 'myJobs' search initiated without a currentUserId. Returning empty results.");
    return [];
  }

  try {
    let jobQuery: AdminQuery<FirebaseFirestore.DocumentData> = adminDb.collection('jobs');

    if (params.isMyJobsSearch && params.currentUserId) {
      console.log(`[searchJobsAction] Filtering by clientId: ${params.currentUserId}`);
      jobQuery = jobQuery.where('clientId', '==', params.currentUserId);
      if (params.filterByStatus && params.filterByStatus !== 'all_my') {
        if (Array.isArray(params.filterByStatus) && params.filterByStatus.length > 0) {
          console.log(`[searchJobsAction] Filtering by status array: ${params.filterByStatus.join(', ')}`);
          jobQuery = jobQuery.where('status', 'in', params.filterByStatus);
        } else if (typeof params.filterByStatus === 'string') {
          console.log(`[searchJobsAction] Filtering by status string: ${params.filterByStatus}`);
          jobQuery = jobQuery.where('status', '==', params.filterByStatus as JobStatus);
        }
      }
    } else {
      console.log(`[searchJobsAction] Filtering for open/pending_quotes jobs`);
      jobQuery = jobQuery.where('status', 'in', ['open', 'pending_quotes']);
    }

    if (params.category && params.category !== 'All') {
      console.log(`[searchJobsAction] Filtering by category: ${params.category}`);
      jobQuery = jobQuery.where('serviceCategory', '==', params.category);
    }

    if (params.location && params.location.trim() !== '') {
      const locationTerm = params.location.trim();
      console.log(`[searchJobsAction] Filtering by location: >= ${locationTerm}, <= ${locationTerm}\\uf8ff`);
      jobQuery = jobQuery.where('location', '>=', locationTerm)
                       .where('location', '<=', locationTerm + '\uf8ff');
    }

    console.log(`[searchJobsAction] Ordering by postedAt desc, limiting to 50`);
    jobQuery = jobQuery.orderBy('postedAt', 'desc').limit(50);

    console.log('[searchJobsAction] Executing Firestore query for jobs.');
    const querySnapshot = await jobQuery.get();

    let jobsData: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postedAt = (data.postedAt as Timestamp)?.toDate();
      const updatedAt = (data.updatedAt as Timestamp)?.toDate();
      const deadline = data.deadline ? (data.deadline as Timestamp).toDate() : null;

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
      console.log(`[searchJobsAction] Applying client-side text filter for jobs: ${keywordTerm}`);
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
      budget: job.budget, 
      deadline: job.deadline, 
    }));
    console.log(`[searchJobsAction] Found ${jobCardData.length} jobs.`);
    return jobCardData;

  } catch (error: any) {
    console.error(`[searchJobsAction] Error during job search. Params: ${JSON.stringify(params)}. Error:`, error.message, error.stack, error.code);
    if (error.message && error.message.includes('FAILED_PRECONDITION') && error.message.includes('index')) {
        console.error("[searchJobsAction] Firestore query requires a composite index. The error message should contain a link to create it in the Firebase console.");
        throw new Error(`Query requires a Firestore index for jobs. Check server logs for a link to create it. Original: ${error.message}`);
    }
    throw new Error(`An error occurred while searching for jobs: ${error.message}.`);
  }
}
