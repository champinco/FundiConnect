
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled_by_client' | 'cancelled_by_provider' | 'completed';

export interface BookingRequest {
  id: string; // Firestore document ID
  providerId: string; // UID of the Fundi
  clientId: string; // UID of the Client
  jobId?: string | null; // Optional: if booking is related to a specific job post
  requestedDate: Date; // The specific date requested by the client
  messageToProvider?: string | null; // Optional message from client during request
  messageToClient?: string | null; // Optional message from provider when confirming/rejecting
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  // Optional: details about the service if not tied to a jobId
  serviceDescription?: string | null;
  estimatedDuration?: string | null; // e.g., "2 hours", "half-day"
}
