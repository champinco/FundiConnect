
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
  id: string; // Should be the same as User UID
  userId: string; // Foreign key to User model, same as id
  businessName: string;
  mainService: ServiceCategory;
  specialties: string[];
  bio: string;
  location: string; // General location (e.g., "Kilimani, Nairobi")
  fullAddress?: string | null; // Specific address, optional
  yearsOfExperience: number;
  isVerified: boolean; 
  verificationAuthority?: string | null; // e.g., "NCA", "EPRA"
  certifications: Certification[];
  portfolio: PortfolioItem[];
  rating: number; // Average rating, calculated
  reviewsCount: number; // Total number of reviews, calculated
  contactPhoneNumber: string; 
  operatingHours?: string | null; // e.g., "Mon-Fri 9am-5pm, Sat 10am-2pm"
  serviceAreas: string[]; // Specific areas/neighborhoods served, e.g., ["Kilimani", "Lavington"]
  profilePictureUrl?: string | null;
  bannerImageUrl?: string | null;
  website?: string | null;
  socialMediaLinks?: Record<string, string> | null; // e.g., { facebook: "url", twitter: "url" }
  createdAt: Date;
  updatedAt: Date;
}
