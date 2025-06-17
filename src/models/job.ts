
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
  budget?: number | null; 
  budgetRange?: { 
    min?: number;
    max?: number;
    currency?: string; 
  };
  urgency: JobUrgency | null; // Made non-optional, defaults to 'medium' or a chosen default in form/service
  deadline?: Date | null; 
  quotesReceived?: number; 
  acceptedQuoteId?: string | null;
}

