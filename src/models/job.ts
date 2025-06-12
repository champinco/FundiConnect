
import type { ServiceCategory } from '@/components/service-category-icon';

export type JobStatus = 'open' | 'pending_quotes' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type JobUrgency = 'low' | 'medium' | 'high';

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
  budget?: number | null; // Optional, numeric budget based on report
  budgetRange?: { // Optional - keeping this for potential future use, but focusing on numeric budget for now
    min?: number;
    max?: number;
    currency?: string; // e.g., "KES"
  };
  urgency?: JobUrgency | null; // Optional urgency level
  deadline?: Date | null; // Optional preferred completion date
  quotesReceived?: number; // Count of quotes received
  acceptedQuoteId?: string | null; // ID of the accepted quote
}
