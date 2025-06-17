
/**
 * @fileOverview Service functions for interacting with booking request data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { BookingRequest, BookingStatus } from '@/models/booking';

export interface CreateBookingRequestData {
  providerId: string;
  clientId: string;
  requestedDate: Date; // JS Date object
  messageToProvider?: string | null;
  jobId?: string | null;
  serviceDescription?: string | null;
}

/**
 * Creates a new booking request document in Firestore using Admin SDK.
 * @param data - The booking request data.
 * @returns A promise that resolves with the ID of the newly created booking request.
 */
export async function createBookingRequest(data: CreateBookingRequestData): Promise<string> {
  if (!adminDb) {
    console.error("[BookingService] Admin DB not initialized. Booking request creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const bookingRequestsCollectionRef = adminDb.collection('bookingRequests');
    const newBookingRef = bookingRequestsCollectionRef.doc(); // Auto-generate ID
    const now = FieldValue.serverTimestamp();

    const bookingPayload: Omit<BookingRequest, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue, requestedDate: Timestamp } = {
      providerId: data.providerId,
      clientId: data.clientId,
      requestedDate: Timestamp.fromDate(data.requestedDate), // Convert JS Date to Firestore Timestamp
      messageToProvider: data.messageToProvider || null,
      jobId: data.jobId || null,
      serviceDescription: data.serviceDescription || null,
      status: 'pending' as BookingStatus,
      createdAt: now,
      updatedAt: now,
    };

    await newBookingRef.set(bookingPayload);
    console.log(`[BookingService] Successfully created booking request ${newBookingRef.id} for provider ${data.providerId} from client ${data.clientId}.`);
    return newBookingRef.id;
  } catch (error: any) {
    console.error(`[BookingService] Error creating booking request. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack);
    throw new Error('Could not create booking request.');
  }
}

/**
 * Updates the status of a booking request.
 * @param bookingId The ID of the booking request to update.
 * @param newStatus The new status for the booking.
 * @param messageToClient Optional message for the client.
 * @returns A promise that resolves when the operation is complete.
 */
export async function updateBookingRequestStatus(bookingId: string, newStatus: BookingStatus, messageToClient?: string | null): Promise<void> {
  if (!adminDb) {
    console.error("[BookingService] Admin DB not initialized. Booking status update failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const bookingRef = adminDb.collection('bookingRequests').doc(bookingId);
  try {
    const updatePayload: Partial<BookingRequest> & { updatedAt: FieldValue } = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };
    if (messageToClient !== undefined) {
      updatePayload.messageToClient = messageToClient;
    }
    await bookingRef.update(updatePayload);
    console.log(`[BookingService] Successfully updated booking request ${bookingId} status to ${newStatus}.`);
  } catch (error: any) {
    console.error(`[BookingService] Error updating booking request ${bookingId} status. Error:`, error.message, error.stack);
    throw new Error('Could not update booking request status.');
  }
}
