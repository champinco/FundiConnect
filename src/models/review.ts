
export interface Review {
  id: string; // Unique ID for the review
  jobId: string; // ID of the job this review pertains to
  providerId: string; // User UID of the Fundi being reviewed
  clientId: string; // User UID of the client who wrote the review
  rating: number; // e.g., 1 to 5 stars
  comment: string;
  reviewDate: Date;
  isEdited?: boolean;
  edited