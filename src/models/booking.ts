
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled_by_client' | 'cancelled_by_provider' | 'completed';

export interface BookingRequest {
  id: string; // Firestore document ID
  providerId: string; // UID of the Fundi
  clientId: string; // UID of the Client
  jobId?: string | null; // Optional: if booking is related to a specific job post
  requestedDate: Date; // The specific date requested by the client
  requestedTimeSlot?: string | null; // e.g., "09:00 - 10:00"
  messageToProvider?: string | null; // Optional message from client during request
  providerResponseMessage?: string | null; // Optional message from provider when confirming/rejecting
  clientResponseMessage?: string | null; // Optional message from client when cancelling (for future use)
  cancellationReason?: string | null; // Reason for cancellation
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  // Optional: details about the service if not tied to a jobId
  serviceDescription?: string | null;
  estimatedDuration?: string | null; // e.g., "2 hours", "half-day"
  clientDetails?: { // Denormalized client info for provider's view
    name: string | null;
    photoURL?: string | null;
    email?: string | null; // Added email for provider context
  };
  providerDetails?: { // Denormalized provider info for client's view
    name: string | null;
    photoURL?: string | null;
    businessName?: string | null; // Added business name
  };
}
