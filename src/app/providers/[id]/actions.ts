
"use server";

import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getReviewsForProvider } from '@/services/reviewService';
import type { ProviderProfile } from '@/models/provider';
import type { Review } from '@/models/review';
import { adminDb } from '@/lib/firebaseAdmin';

interface PublicProviderProfilePageData {
  provider: ProviderProfile | null;
  reviews: Review[];
  error?: string;
}

export async function fetchPublicProviderProfileDataAction(providerId: string): Promise<PublicProviderProfilePageData> {
  if (!adminDb) {
    console.error("[fetchPublicProviderProfileDataAction] CRITICAL: Admin DB not initialized. Aborting fetch.");
    return { provider: null, reviews: [], error: "Server error: Database service is not available. Please try again later." };
  }
  if (!providerId) {
    return { provider: null, reviews: [], error: "Provider ID is missing." };
  }

  try {
    const [profile, reviews] = await Promise.all([
      getProviderProfileFromFirestore(providerId),
      getReviewsForProvider(providerId)
    ]);

    if (!profile) {
      return { provider: null, reviews: [], error: "Provider profile not found." };
    }

    return { provider: profile, reviews: reviews.sort((a,b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()) };
  } catch (error: any) {
    console.error("[fetchPublicProviderProfileDataAction] Error fetching public provider profile data. Provider ID:", providerId, "Error Details:", error.message, error.stack);
    return { provider: null, reviews: [], error: error.message || "Failed to load provider data due to an unexpected server error." };
  }
}
