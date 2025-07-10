
export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'archived';

export interface Quote {
  id: string; // Firestore document ID
  jobId: string; // ID of the job this quote is for
  providerId: string; // UID of the Fundi submitting the quote
  clientId: string; // UID of the client who posted the job
  amount: number;
  currency: string; // e.g., "KES"
  messageToClient: string; // Provider's message accompanying the quote
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
  // Optional: details about the quote validity, specific terms, etc.
  validUntil?: Date | null;
  // Optional: denormalized provider details for easier display
  providerDetails?: {
    businessName: string;
    profilePictureUrl?: string | null;
    rating: number;
    reviewsCount: number;
    yearsOfExperience: number;
  };
}
