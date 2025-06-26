
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job } from '@/models/job'; // Keep for type safety, though not used in new featured logic

/**
 * Fetches the top 3 verified providers based on rating and review count.
 * This implementation uses a single, efficient, and scalable Firestore query.
 */
export async function fetchFeaturedProvidersAction(): Promise<Provider[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchFeaturedProvidersAction] CRITICAL: Firebase Admin DB not initialized. Aborting.");
    throw new Error("Server error: Core database service unavailable.");
  }

  try {
    const MIN_REVIEWS_FOR_FEATURED = 3; // Set a minimum number of reviews to be considered for featuring.
    
    console.log(`[fetchFeaturedProvidersAction] Fetching top providers with at least ${MIN_REVIEWS_FOR_FEATURED} reviews.`);

    const providersQuery = adminDb.collection('providerProfiles')
      .where('isVerified', '==', true)
      .where('reviewsCount', '>=', MIN_REVIEWS_FOR_FEATURED)
      .orderBy('reviewsCount', 'desc') // Order by most reviews first
      .orderBy('rating', 'desc')       // Then by highest rating
      .limit(3);

    const snapshot = await providersQuery.get();

    if (snapshot.empty) {
        console.log("[fetchFeaturedProvidersAction] No providers met the featuring criteria. Returning empty array.");
        return [];
    }

    const providers: Provider[] = snapshot.docs.map(doc => {
        const data = doc.data() as ProviderProfile;
        const bio = data.bio || "";
        return {
            id: doc.id,
            name: data.businessName || "Unnamed Provider",
            profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/300x300.png',
            rating: data.rating || 0,
            reviewsCount: data.reviewsCount || 0,
            location: data.location || "N/A",
            mainService: data.mainService || 'Other' as ServiceCategory,
            otherMainServiceDescription: data.otherMainServiceDescription,
            isVerified: data.isVerified || false,
            verificationAuthority: data.verificationAuthority || undefined,
            bioSummary: bio.substring(0, 100) + (bio.length > 100 ? '...' : ''),
        };
    });

    console.log(`[fetchFeaturedProvidersAction] Successfully fetched ${providers.length} featured providers.`);
    return providers;

  } catch (error: any) {
    console.error("[fetchFeaturedProvidersAction] Error fetching featured providers:", error.message, error.stack);
    // This error might indicate a missing Firestore composite index.
    if (error.message && error.message.includes('index')) {
        console.error("A composite index is likely required for this query. Please check the Firebase console error logs for a creation link.");
    }
    return []; // Return empty on error to prevent crashing the homepage.
  }
}


export interface HomepageStats {
  totalJobsCompleted: number;
  averageProviderRating: number;
  totalVerifiedProviders: number;
}

/**
 * Fetches homepage statistics using efficient count queries and optimized reads.
 */
export async function fetchHomepageStatsAction(): Promise<HomepageStats> {
  if (!adminDb) {
    console.error("[fetchHomepageStatsAction] Admin DB not initialized.");
    return { totalJobsCompleted: 0, averageProviderRating: 0, totalVerifiedProviders: 0 };
  }

  try {
    // 1. Total Jobs Completed (Efficiently using .count())
    const completedJobsSnap = await adminDb.collection('jobs').where('status', '==', 'completed').count().get();
    const totalJobsCompleted = completedJobsSnap.data().count;

    // 2. Total Verified Providers (Efficiently using .count())
    const verifiedProvidersSnap = await adminDb.collection('providerProfiles').where('isVerified', '==', true).count().get();
    const totalVerifiedProviders = verifiedProvidersSnap.data().count;

    // 3. Average Provider Rating (Optimized to fetch only providers with ratings)
    const ratedProvidersSnap = await adminDb.collection('providerProfiles').where('rating', '>', 0).get();
    let sumOfRatings = 0;
    let providersWithRatingsCount = 0;

    ratedProvidersSnap.forEach(doc => {
      const provider = doc.data() as ProviderProfile;
      // This check is slightly redundant due to the query, but good for safety.
      if (provider.rating > 0) { 
        sumOfRatings += provider.rating;
        providersWithRatingsCount++;
      }
    });

    const averageProviderRating = providersWithRatingsCount > 0 
        ? parseFloat((sumOfRatings / providersWithRatingsCount).toFixed(1)) 
        : 0;

    console.log(`[fetchHomepageStatsAction] Stats: JobsCompleted=${totalJobsCompleted}, AvgRating=${averageProviderRating}, VerifiedProviders=${totalVerifiedProviders}`);
    
    return {
      totalJobsCompleted,
      averageProviderRating,
      totalVerifiedProviders,
    };
  } catch (error: any) {
    console.error("[fetchHomepageStatsAction] Error fetching homepage stats:", error);
    if (error.message && error.message.includes('index')) {
        console.error("A composite index is likely required for a stats query. Please check the Firebase console error logs for a creation link.");
    }
    return { totalJobsCompleted: 0, averageProviderRating: 0, totalVerifiedProviders: 0 };
  }
}
