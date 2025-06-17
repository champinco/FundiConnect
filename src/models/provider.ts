
import type { ServiceCategory } from '@/components/service-category-icon';

export interface Certification {
  id: string;
  name: string;
  number: string;
  issuingBody: string;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  documentUrl: string | null;
  status: 'pending_review' | 'verified' | 'requires_attention' | 'expired' | 'not_applicable';
  verificationNotes: string | null;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  description: string;
  dataAiHint?: string;
}

export interface ProviderProfile {
  id: string; 
  userId: string; 
  businessName: string;
  mainService: ServiceCategory;
  specialties: string[]; 
  skills: string[]; 
  bio: string;
  location: string; 
  fullAddress?: string | null; 
  yearsOfExperience: number;
  isVerified: boolean;
  verificationAuthority?: string | null; 
  certifications: Certification[];
  portfolio: PortfolioItem[];
  rating: number; 
  reviewsCount: number; 
  contactPhoneNumber: string;
  operatingHours?: string | null; 
  serviceAreas: string[]; 
  profilePictureUrl?: string | null;
  bannerImageUrl?: string | null;
  website?: string | null;
  socialMediaLinks?: Record<string, string> | null; 
  unavailableDates?: string[]; // Array of "YYYY-MM-DD" strings
  receivesEmergencyJobAlerts?: boolean; // New field for emergency job opt-in
  createdAt: Date;
  updatedAt: Date;
}

