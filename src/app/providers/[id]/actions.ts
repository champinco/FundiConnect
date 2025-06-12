
"use server";

import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getReviewsForProvider } from '@/services/reviewService';
import type { ProviderProfile } from '@/models/provider';
import type { Review } from '@/models/review';

interface PublicProviderProfilePageData {
  provider: ProviderProfile | null;
  reviews: Review[];
  error?: string;
}

export async function fetchPublicProviderProfileDataAction(providerId: string): Promise<PublicProviderProfilePageData> {
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
    console.error("Error fetching public provider profile data:", error);
    return { provider: null, reviews: [], error: error.message || "Failed to load provider data." };
  }
}
