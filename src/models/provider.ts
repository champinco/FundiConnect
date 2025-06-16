
import type { ServiceCategory } from '@/components/service-category-icon';

export interface Certification {
  id: string; // Unique ID for the certification (e.g., UUID generated on client or Firestore ID)
  name: string;
  number: string;
  issuingBody: string;
  issueDate?: Date | null; // Store as Date object
  expiryDate?: Date | null; // Store as Date object
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
  bio: string;
  location: string;
  fullAddress?: string | null;
  yearsOfExperience: number;
  isVerified: boolean; // Overall profile verification status
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
  createdAt: Date;
  updatedAt: Date;
}
