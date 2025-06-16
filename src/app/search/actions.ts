
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { Timestamp, FieldPath, Query as AdminQuery } from 'firebase-admin/firestore';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job, JobStatus } from '@/models/job';
import type { JobCardProps } from '@/components/job-card';

// Helper to ensure adminDb is available
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[SearchActions] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

export interface SearchParams {
  query?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  minRating?: number | null;
  verifiedOnly?: boolean | null;
}

export async function searchProvidersAction(params: SearchParams): Promise<Provider[]> {
  ensureDbInitialized();
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
      // Simple prefix match for location - consider more advanced search if needed
      // This might require an index on 'location' if you also sort by it without an equality filter first.
      providerQuery = providerQuery.where('location', '>=', locationSearchTerm)
                                   .where('location', '<=', locationSearchTerm + '\uf8ff');
    }

    let hasRatingOrder = false;
    if (params.minRating && params.minRating > 0) {
      console.log(`[searchProvidersAction] Applying minRating filter: >= ${params.minRating}`);
      providerQuery = providerQuery.where('rating', '>=', params.minRating);
      // Firestore requires the first orderBy field to match the inequality filter field.
      providerQuery = providerQuery.orderBy('rating', 'desc');
      hasRatingOrder = true;
    }

    // If not sorting by rating, default to sorting by businessName for consistency
    // Note: Firestore queries require an index for most orderBy clauses if not combined with an equality filter.
    // If you filter by category (equality) then order by name, it's generally fine.
    // If you only filter by location (range) then order by name, you'll need a composite index.
    if (!hasRatingOrder) {
      console.log(`[searchProvidersAction] Applying default order by businessName`);
      providerQuery = providerQuery.orderBy('businessName'); // Default sort
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

    // Client-side filtering for text query (if provided) across multiple fields
    // This is less efficient than Firestore full-text search (e.g., Algolia, Typesense integration)
    // but works for smaller datasets or simpler search needs.
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
    console.error("[searchProvidersAction] Error during provider search. Params:", JSON.stringify(params));
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    // It's better to re-throw a generic error than expose raw Firestore error details to the client.
    throw new Error("An error occurred while searching for providers. Please try again.");
  }
}

export interface JobSearchParams {
  keywords?: string | null;
  location?: string | null;
  category?: ServiceCategory | 'All' | null;
  currentUserId?: string | null; // For "My Jobs" search
  filterByStatus?: JobStatus | JobStatus[] | string | null; // For "My Jobs" status filter
  isMyJobsSearch?: boolean;
}

export async function searchJobsAction(params: JobSearchParams): Promise<JobCardProps['job'][]> {
  ensureDbInitialized();
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
      // Apply status filter only if it's not 'all_my' (which implies no status filter for user's jobs)
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
      // For general job browsing, only show 'open' or 'pending_quotes' jobs
      console.log(`[searchJobsAction] Filtering for open/pending_quotes jobs`);
      jobQuery = jobQuery.where('status', 'in', ['open', 'pending_quotes']);
    }

    // Category filter (for both myJobs and general search)
    if (params.category && params.category !== 'All') {
      console.log(`[searchJobsAction] Filtering by category: ${params.category}`);
      jobQuery = jobQuery.where('serviceCategory', '==', params.category);
    }

    // Location filter (for both myJobs and general search)
    // This kind of range query on location might require a composite index if combined with other filters/orders.
    if (params.location && params.location.trim() !== '') {
      const locationTerm = params.location.trim();
      console.log(`[searchJobsAction] Filtering by location: >= ${locationTerm}, <= ${locationTerm}\\uf8ff`);
      jobQuery = jobQuery.where('location', '>=', locationTerm)
                       .where('location', '<=', locationTerm + '\uf8ff');
    }

    // Default ordering for all job searches
    console.log(`[searchJobsAction] Ordering by postedAt desc, limiting to 50`);
    jobQuery = jobQuery.orderBy('postedAt', 'desc').limit(50);

    console.log('[searchJobsAction] Executing Firestore query for jobs.');
    const querySnapshot = await jobQuery.get();

    let jobsData: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Ensure Timestamps are converted to Date objects
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

    // Client-side keyword filtering for jobs (if keywords are provided)
    if (params.keywords && params.keywords.trim() !== '') {
      const keywordTerm = params.keywords.trim().toLowerCase();
      console.log(`[searchJobsAction] Applying client-side text filter for jobs: ${keywordTerm}`);
      jobsData = jobsData.filter(job =>
        (job.title && job.title.toLowerCase().includes(keywordTerm)) ||
        (job.description && job.description.toLowerCase().includes(keywordTerm))
      );
    }

    // Map to the structure expected by JobCardProps
    const jobCardData: JobCardProps['job'][] = jobsData.map(job => ({
      id: job.id,
      title: job.title,
      serviceCategory: job.serviceCategory,
      otherCategoryDescription: job.otherCategoryDescription,
      location: job.location,
      postedAt: job.postedAt,
      status: job.status,
      description: job.description, // Ensure description is passed
      budget: job.budget, // Pass budget
      deadline: job.deadline, // Pass deadline
    }));
    console.log(`[searchJobsAction] Found ${jobCardData.length} jobs.`);
    return jobCardData;

  } catch (error: any) {
    console.error("[searchJobsAction] Error during job search. Params:", JSON.stringify(params));
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw new Error("An error occurred while searching for jobs. Please try again.");
  }
}
