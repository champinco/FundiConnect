import type { ServiceCategory } from '@/components/service-category-icon';

export type JobStatus = 'open' | 'pending_quotes' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface Job {
  id: string; // Unique ID for the job
  clientId: string; // User UID of the client who posted the job
  title: string;
  description: string;
  serviceCategory: ServiceCategory;
  otherCategoryDescription?: string; // If serviceCategory is 'Other'
  location: string; // Job location, can be specific or general
  status: JobStatus;
  postedAt: Date;
  updatedAt: Date;
  assignedProviderId?: string | null; // User UID of the Fundi assigned to the job
  photosOrVideos?: string[]; // URLs of uploaded images/videos
  budgetRange?: { // Optional
    min?: number;
    max?: number;
    currency?: string; // e.g., "KES"
  };
  deadline?: Date | null; // Optional preferred completion date
  quotesReceived?: number; // Count of quotes received
  acceptedQuoteId?: string | null; // ID of the accepted quote
}