
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
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
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchPublicProviderProfileDataAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { provider: null, reviews: [], error: "Server error: Core database service unavailable." };
  }
  
  console.log(`[fetchPublicProviderProfileDataAction] Initiated for providerId: ${providerId}`);

  if (!providerId) {
    console.error("[fetchPublicProviderProfileDataAction] Provider ID is missing.");
    return { provider: null, reviews: [], error: "Provider ID is missing." };
  }

  try {
    const [profile, reviews] = await Promise.all([
      getProviderProfileFromFirestore(providerId),
      getReviewsForProvider(providerId)
    ]);

    if (!profile) {
      console.warn(`[fetchPublicProviderProfileDataAction] Provider profile not found for ID: ${providerId}`);
      return { provider: null, reviews: [], error: "Provider profile not found." };
    }
    console.log(`[fetchPublicProviderProfileDataAction] Profile found for ${providerId}. Reviews count: ${reviews.length}`);
    return { provider: profile, reviews: reviews.sort((a,b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()) };
  } catch (error: any) {
    console.error(`[fetchPublicProviderProfileDataAction] Error fetching public profile data for Provider ID: ${providerId}. Error:`, error.message, error.stack, error.code);
    return { provider: null, reviews: [], error: `Failed to load provider data: ${error.message}.` };
  }
}
