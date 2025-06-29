
/**
 * @fileOverview Service functions for interacting with booking request data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp, FieldValue, type UpdateData } from 'firebase-admin/firestore';
import type { BookingRequest, BookingStatus } from '@/models/booking';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { sendBookingRequestProviderEmail } from '@/services/emailService'; // Import email service

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

    const clientProfile = await getUserProfileFromFirestore(data.clientId);
    const providerProfile = await getProviderProfileFromFirestore(data.providerId); // Correctly fetch provider profile

    const bookingPayload: Omit<BookingRequest, 'id' | 'createdAt' | 'updatedAt' | 'providerResponseMessage' | 'clientResponseMessage'> & { createdAt: FieldValue, updatedAt: FieldValue, requestedDate: Timestamp, providerResponseMessage: null, clientResponseMessage: null } = {
      providerId: data.providerId,
      clientId: data.clientId,
      requestedDate: Timestamp.fromDate(data.requestedDate),
      messageToProvider: data.messageToProvider || null,
      jobId: data.jobId || null,
      serviceDescription: data.serviceDescription || null,
      status: 'pending' as BookingStatus,
      clientDetails: {
        name: clientProfile?.fullName || "Client",
        photoURL: clientProfile?.photoURL || null,
        email: clientProfile?.email || null,
      },
      providerDetails: {
        name: providerProfile?.businessName || providerProfile?.userId || "Provider",
        photoURL: providerProfile?.profilePictureUrl || null,
        businessName: providerProfile?.businessName || null,
      },
      providerResponseMessage: null,
      clientResponseMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    await newBookingRef.set(bookingPayload);
    console.log(`[BookingService] Successfully created booking request ${newBookingRef.id} for provider ${data.providerId} from client ${data.clientId}.`);
    
    // Send email notification to provider
    const providerUserEmail = (await getUserProfileFromFirestore(data.providerId))?.email;
    if (providerUserEmail) {
        await sendBookingRequestProviderEmail(
            providerUserEmail,
            clientProfile?.fullName || "A Client",
            data.requestedDate,
            data.messageToProvider
        );
    }
    
    return newBookingRef.id;
  } catch (error: any) {
    console.error(`[BookingService] Error creating booking request. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack);
    throw new Error('Could not create booking request.');
  }
}

const robustTimestampToDate = (timestamp: any, defaultVal: Date = new Date()): Date => {
    if (!timestamp) return defaultVal;
    if (timestamp instanceof Date) return timestamp;
    if (typeof (timestamp as any).toDate === 'function') {
        return (timestamp as import('firebase-admin/firestore').Timestamp).toDate();
    }
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {/* ignore */}
    return defaultVal;
};


/**
 * Retrieves all booking requests for a specific provider.
 * @param providerId The UID of the provider.
 * @returns A promise that resolves with an array of BookingRequest objects.
 */
export async function getBookingRequestsForProvider(providerId: string): Promise<BookingRequest[]> {
  if (!adminDb) {
    console.error("[BookingService] Admin DB not initialized. Cannot fetch provider bookings.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const bookingsRef = adminDb.collection('bookingRequests');
  const q = bookingsRef.where('providerId', '==', providerId).orderBy('createdAt', 'desc');
  const snapshot = await q.get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      requestedDate: robustTimestampToDate(data.requestedDate),
      createdAt: robustTimestampToDate(data.createdAt),
      updatedAt: robustTimestampToDate(data.updatedAt),
    } as BookingRequest;
  });
}

/**
 * Retrieves all booking requests made by a specific client.
 * @param clientId The UID of the client.
 * @returns A promise that resolves with an array of BookingRequest objects.
 */
export async function getBookingRequestsForClient(clientId: string): Promise<BookingRequest[]> {
  if (!adminDb) {
    console.error("[BookingService] Admin DB not initialized. Cannot fetch client bookings.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const bookingsRef = adminDb.collection('bookingRequests');
  const q = bookingsRef.where('clientId', '==', clientId).orderBy('createdAt', 'desc');
  const snapshot = await q.get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      requestedDate: robustTimestampToDate(data.requestedDate),
      createdAt: robustTimestampToDate(data.createdAt),
      updatedAt: robustTimestampToDate(data.updatedAt),
    } as BookingRequest;
  });
}

/**
 * Updates the status of a booking request and optionally a message.
 * @param bookingId The ID of the booking request to update.
 * @param newStatus The new status for the booking.
 * @param byUserType Indicates if the update is by 'provider' or 'client'.
 * @param message Optional message related to the status update.
 * @returns A promise that resolves when the operation is complete.
 */
export async function updateBookingRequestStatus(
  bookingId: string,
  newStatus: BookingStatus,
  byUserType: 'provider' | 'client',
  message?: string | null
): Promise<void> {
  if (!adminDb) {
    console.error("[BookingService] Admin DB not initialized. Booking status update failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const bookingRef = adminDb.collection('bookingRequests').doc(bookingId);
  try {
    const updatePayload: UpdateData<BookingRequest> = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    if (message !== undefined) {
      if (byUserType === 'provider') {
        updatePayload.providerResponseMessage = message;
      } else {
        // For future use if clients can add messages when cancelling, etc.
        // updatePayload.clientResponseMessage = message;
      }
    }
    await bookingRef.update(updatePayload);
    console.log(`[BookingService] Successfully updated booking request ${bookingId} status to ${newStatus}.`);
  } catch (error: any) {
    console.error(`[BookingService] Error updating booking request ${bookingId} status. Error:`, error.message, error.stack);
    throw new Error('Could not update booking request status.');
  }
}
