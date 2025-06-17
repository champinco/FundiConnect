
export type NotificationType =
  | 'new_booking_request'
  | 'booking_status_changed' // e.g., confirmed, rejected
  | 'new_message'
  | 'new_quote_received'
  | 'quote_status_changed' // e.g., accepted, rejected
  | 'new_review'
  | 'job_status_changed'; // e.g., completed, cancelled

export interface Notification {
  id: string; // Firestore document ID
  userId: string; // The UID of the user who should receive this notification
  type: NotificationType;
  message: string; // A brief, human-readable message for the notification
  relatedEntityId?: string | null; // ID of the entity this notification relates to (e.g., bookingId, chatId, jobId, quoteId, reviewId)
  isRead: boolean;
  createdAt: Date;
  // Optional: deep link path for navigation
  link?: string | null;
}
