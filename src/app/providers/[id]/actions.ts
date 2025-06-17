
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getReviewsForProvider } from '@/services/reviewService';
import { createBookingRequest as createBookingRequestService } from '@/services/bookingService'; 
import { createNotification } from '@/services/notificationService';
import type { ProviderProfile } from '@/models/provider';
import type { Review } from '@/models/review';
import { format, parseISO, isSameDay } from 'date-fns'; 


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
    console.log(`[fetchPublicProviderProfileDataAction] Profile found for ${providerId}. Reviews count: ${reviews.length}. Unavailable dates:`, profile.unavailableDates);
    return { 
        provider: profile, 
        reviews: reviews.sort((a,b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()) 
    };
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

    const requestedDateString = format(requestedDate, 'yyyy-MM-dd');
    if (providerProfile.unavailableDates?.some(unavailableDateStr => isSameDay(parseISO(unavailableDateStr), requestedDate))) {
      return { success: false, message: "The provider has marked this date as unavailable. Please choose another date." };
    }


    const bookingId = await createBookingRequestService({
      providerId,
      clientId,
      requestedDate,
      messageToProvider,
    });

    await createNotification({
      userId: providerId,
      type: 'new_booking_request',
      message: `You have a new booking request from client ${clientId.substring(0,6)}... for ${format(requestedDate, 'PPP')}.`,
      relatedEntityId: bookingId,
      link: `/dashboard` 
    });

    return { success: true, message: "Booking request sent successfully!", bookingId };
  } catch (error: any) {
    console.error(`[requestBookingAction] Error. ProviderID: ${providerId}, ClientID: ${clientId}. Error:`, error.message);
    return { success: false, message: `Failed to send booking request: ${error.message}.` };
  }
}
