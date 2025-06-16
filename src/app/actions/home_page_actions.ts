
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import type { ProviderProfile } from '@/models/provider';
import type { Provider } from '@/components/provider-card';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { Timestamp } from 'firebase-admin/firestore';

export async function fetchFeaturedProvidersAction(): Promise<Provider[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchFeaturedProvidersAction] CRITICAL: Firebase Admin DB not initialized. Aborting.");
    throw new Error("Server error: Core database service unavailable.");
  }

  try {
    const providersRef = adminDb.collection('providerProfiles');
    const q = providersRef
      .where('isVerified', '==', true)
      .orderBy('rating', 'desc')
      .limit(3);

    const querySnapshot = await q.get();
    const providers: Provider[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as ProviderProfile; // Cast to ProviderProfile
      const bio = data.bio || ""; // Ensure bio is a string

      providers.push({
        id: doc.id,
        name: data.businessName || "Unnamed Provider",
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/300x300.png',
        rating: data.rating || 0,
        reviewsCount: data.reviewsCount || 0,
        location: data.location || "N/A",
        mainService: data.mainService || 'Other' as ServiceCategory,
        isVerified: data.isVerified || false,
        verificationAuthority: data.verificationAuthority || undefined,
        bioSummary: bio.substring(0, 100) + (bio.length > 100 ? '...' : ''),
      });
    });
    console.log(`[fetchFeaturedProvidersAction] Successfully fetched ${providers.length} featured providers.`);
    return providers;
  } catch (error: any) {
    console.error("[fetchFeaturedProvidersAction] Error fetching featured providers:", error.message, error.stack);
    // Depending on how you want to handle errors, you might throw, or return empty, or return an error object
    // For now, returning empty to match previous client-side behavior.
    return [];
  }
}
