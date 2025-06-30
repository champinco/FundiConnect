
export interface Review {
  id: string; // Unique ID for the review
  jobId: string; // ID of the job this review pertains to
  providerId: string; // User UID of the Fundi being reviewed
  clientId: string; // User UID of the client who wrote the review
  
  rating: number; // Overall average rating
  qualityRating: number;
  timelinessRating: number;
  professionalismRating: number;

  comment: string;
  reviewDate: Date;
  
  providerResponse?: string | null;
  providerResponseDate?: Date | null;

  isVerifiedJob?: boolean; // To mark if the review is from a completed job on the platform

  isEdited?: boolean;
  editedAt?: Date; // Add this field
  clientDetails?: { // Optional: Denormalized client info for display
    name: string | null;
    photoURL?: string | null;
  };
}
