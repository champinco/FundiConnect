
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getBookingRequestsForClient as getClientBookings, getBookingRequestsForProvider as getProviderBookings, updateBookingRequestStatus as updateStatusService, createBookingRequest as createBookingRequestService } from '@/services/bookingService';
import type { BookingRequest, BookingStatus, CreateBookingRequestData } from '@/models/booking';
import { createNotification } from '@/services/notificationService';
import { getJobByIdFromFirestore } from '@/services/jobService';
import { getUserProfileFromFirestore } from '@/services/userService';
import { format } from 'date-fns';


export async function fetchClientBookingRequestsAction(clientId: string): Promise<BookingRequest[]> {
  if (!adminDb || !clientId) return [];
  try {
    return await getClientBookings(clientId);
  } catch (error: any) {
    console.error(`[fetchClientBookingRequestsAction] Error: ${error.message}`);
    return [];
  }
}

export async function fetchProviderBookingRequestsAction(providerId: string): Promise<BookingRequest[]> {
  if (!adminDb || !providerId) return [];
  try {
    return await getProviderBookings(providerId);
  } catch (error: any) {
    console.error(`[fetchProviderBookingRequestsAction] Error: ${error.message}`);
    return [];
  }
}

interface RespondToBookingResult {
  success: boolean;
  message: string;
}

export async function providerRespondToBookingAction(
  bookingId: string,
  providerId: string,
  newStatus: 'confirmed' | 'rejected',
  providerMessage?: string
): Promise<RespondToBookingResult> {
  if (!adminDb) return { success: false, message: "Server error: Core database service unavailable." };
  if (!bookingId || !providerId || !newStatus) return { success: false, message: "Missing required fields." };

  try {
    const bookingRef = adminDb.collection('bookingRequests').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) return { success: false, message: "Booking request not found." };
    
    const bookingData = bookingSnap.data() as BookingRequest;
    if (bookingData.providerId !== providerId) {
      return { success: false, message: "Unauthorized to respond to this booking." };
    }
    // Convert Firestore Timestamp to JS Date for bookingData if needed before passing to service
    const serviceBookingData = {
        ...bookingData,
        requestedDate: bookingData.requestedDate instanceof Timestamp ? bookingData.requestedDate.toDate() : new Date(bookingData.requestedDate),
        createdAt: bookingData.createdAt instanceof Timestamp ? bookingData.createdAt.toDate() : new Date(bookingData.createdAt),
        updatedAt: bookingData.updatedAt instanceof Timestamp ? bookingData.updatedAt.toDate() : new Date(bookingData.updatedAt),
    };


    await updateStatusService(bookingId, newStatus, 'provider', providerMessage);

    // Notify client
    const clientProfile = await getUserProfileFromFirestore(serviceBookingData.clientId);
    const providerProfile = await getUserProfileFromFirestore(providerId);
    const statusText = newStatus === 'confirmed' ? 'confirmed' : 'not accepted';
    
    let jobTitleSegment = "";
    if (serviceBookingData.jobId) {
        const job = await getJobByIdFromFirestore(serviceBookingData.jobId);
        if (job) jobTitleSegment = ` for job "${job.title.substring(0,20)}..."`;
    } else if (serviceBookingData.serviceDescription) {
        jobTitleSegment = ` for "${serviceBookingData.serviceDescription.substring(0,20)}..."`;
    }


    await createNotification({
      userId: serviceBookingData.clientId,
      type: 'booking_status_changed',
      message: `Your booking request with ${providerProfile?.fullName || providerProfile?.businessName || 'Provider'} for ${format(serviceBookingData.requestedDate, 'PPP')}${jobTitleSegment} has been ${statusText}. ${providerMessage ? 'Provider message: ' + providerMessage.substring(0,50) + '...' : ''}`,
      relatedEntityId: bookingId,
      link: `/dashboard` // Link to client's dashboard to see booking status
    });

    return { success: true, message: `Booking request ${newStatus}.` };
  } catch (error: any) {
    console.error(`[providerRespondToBookingAction] Error: ${error.message}`);
    return { success: false, message: `Failed to respond to booking: ${error.message}` };
  }
}
