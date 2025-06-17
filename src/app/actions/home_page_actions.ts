
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Job } from '@/models/job'; // Import Job model

export async function fetchFeaturedProvidersAction(): Promise<Provider[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchFeaturedProvidersAction] CRITICAL: Firebase Admin DB not initialized. Aborting.");
    throw new Error("Server error: Core database service unavailable.");
  }

  try {
    // 1. Get all 'completed' jobs
    const jobsSnapshot = await adminDb.collection('jobs').where('status', '==', 'completed').get();
    const providerJobCounts: Record<string, number> = {};

    jobsSnapshot.forEach(doc => {
        const job = doc.data() as Job;
        if (job.assignedProviderId) {
            providerJobCounts[job.assignedProviderId] = (providerJobCounts[job.assignedProviderId] || 0) + 1;
        }
    });
    console.log(`[fetchFeaturedProvidersAction] Calculated job counts for ${Object.keys(providerJobCounts).length} providers.`);

    // 2. Get all verified provider profiles
    const verifiedProvidersSnapshot = await adminDb.collection('providerProfiles').where('isVerified', '==', true).get();
    const verifiedProviderData: Record<string, ProviderProfile> = {};
    verifiedProvidersSnapshot.forEach(doc => {
        // Assuming doc.data() is ProviderProfile; needs casting and date handling if timestamps are involved
        const data = doc.data() as ProviderProfile; 
        verifiedProviderData[doc.id] = {
            ...data,
            // Ensure any Firestore Timestamps are converted if ProviderProfile expects JS Dates
            // For MVP, assuming direct cast is sufficient if dates are not immediately used or already stored as strings/numbers
        };
    });
    console.log(`[fetchFeaturedProvidersAction] Fetched ${verifiedProvidersSnapshot.size} verified provider profiles.`);

    // 3. Combine, filter by verified, and rank
    const rankedProviders: Array<{ id: string; count: number; profile: ProviderProfile }> = [];
    for (const providerId in providerJobCounts) {
        if (verifiedProviderData[providerId]) { // Check if this provider is verified
            rankedProviders.push({
                id: providerId,
                count: providerJobCounts[providerId],
                profile: verifiedProviderData[providerId]
            });
        }
    }

    rankedProviders.sort((a, b) => b.count - a.count); // Sort by job count descending
    console.log(`[fetchFeaturedProvidersAction] ${rankedProviders.length} verified providers with completed jobs found and ranked.`);

    // 4. Take top 3 (or fewer if not enough)
    const topProvidersData = rankedProviders.slice(0, 3);

    // 5. Map to Provider[] type for the frontend
    const providers: Provider[] = topProvidersData.map(item => {
        const data = item.profile;
        const bio = data.bio || "";
        return {
            id: item.id,
            name: data.businessName || "Unnamed Provider",
            profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/300x300.png',
            rating: data.rating || 0,
            reviewsCount: data.reviewsCount || 0,
            location: data.location || "N/A",
            mainService: data.mainService || 'Other' as ServiceCategory,
            isVerified: data.isVerified || false, // Should be true
            verificationAuthority: data.verificationAuthority || undefined,
            bioSummary: bio.substring(0, 100) + (bio.length > 100 ? '...' : ''),
            // Optionally, you could add completedJobsCount to the Provider type if you want to display it on the card
            // completedJobs: item.count, 
        };
    });
    console.log(`[fetchFeaturedProvidersAction] Successfully fetched ${providers.length} featured providers based on completed jobs and verification.`);
    return providers;
  } catch (error: any) {
    console.error("[fetchFeaturedProvidersAction] Error fetching featured providers:", error.message, error.stack);
    return [];
  }
}

