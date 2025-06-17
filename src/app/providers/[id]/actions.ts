
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getReviewsForProvider } from '@/services/reviewService';
import { createBookingRequest } from '@/services/bookingService';
import { createNotification } from '@/services/notificationService';
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


interface RequestBookingResult {
  success: boolean;
  message: string;
  bookingId?: string;
}
export async function requestBookingAction(
  providerId: string,
  clientId: string,
  requestedDate: Date,
  messageToProvider?: string | null
): Promise<RequestBookingResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  if (!providerId || !clientId || !requestedDate) {
    return { success: false, message: "Missing required fields for booking request." };
  }

  try {
    const providerProfile = await getProviderProfileFromFirestore(providerId);
    if (!providerProfile) {
      return { success: false, message: "Provider not found." };
    }

    // Optional: Check if requestedDate is in provider's unavailableDates
    // For MVP, this check can be deferred or handled by provider communication
    if (providerProfile.unavailableDates?.includes(new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate()).toISOString().split('T')[0])) {
      // Note: This is a basic check. For production, ensure consistent date formatting.
      // return { success: false, message: "The provider is unavailable on the selected date." };
      // For MVP, we allow request and let provider handle.
    }

    const bookingId = await createBookingRequest({
      providerId,
      clientId,
      requestedDate,
      messageToProvider,
    });

    // Create notification for the provider
    await createNotification({
      userId: providerId,
      type: 'new_booking_request',
      message: `You have a new booking request from client ${clientId.substring(0,6)}... for ${requestedDate.toLocaleDateString()}.`,
      relatedEntityId: bookingId,
      link: `/dashboard/bookings/${bookingId}` // Example link
    });

    return { success: true, message: "Booking request sent successfully!", bookingId };
  } catch (error: any) {
    console.error(`[requestBookingAction] Error. ProviderID: ${providerId}, ClientID: ${clientId}. Error:`, error.message);
    return { success: false, message: `Failed to send booking request: ${error.message}.` };
  }
}

