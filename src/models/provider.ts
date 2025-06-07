import type { ServiceCategory } from '@/components/service-category-icon';

export interface Certification {
  name: string;
  number: string;
  issuingBody?: string;
  issueDate?: Date;
  expiryDate?: Date;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  description: string;
  dataAiHint?: string; // For AI-assisted image searching or description
}

export interface ProviderProfile {
  id: string; // Corresponds to User UID or a dedicated ID
  userId: string; // Link back to the User document (Firebase Auth UID)
  businessName: string; // Can be same as user's fullName or a registered business name
  mainService: ServiceCategory;
  specialties: string[];
  bio: string;
  location: string; // General area, e.g., "Kilimani, Nairobi"
  fullAddress?: string; // More specific, optional
  yearsOfExperience: number;
  isVerified: boolean;
  verificationAuthority?: string; // e.g., "EPRA", "NCA"
  certifications: Certification[];
  portfolio: PortfolioItem[];
  rating: number; // Average rating, calculated
  reviewsCount: number; // Total number of reviews, calculated
  contactPhoneNumber: string; // Business phone, might differ from user's personal phone
  operatingHours?: string; // e.g., "Mon-Fri 9am-5pm, Sat 10am-2pm" or structured
  serviceAreas: string[]; // List of areas they serve
  profilePictureUrl?: string; // URL for business/provider profile picture
  bannerImageUrl?: string; // URL for a banner/cover image on their profile
  website?: string; // Optional link to their website
  socialMediaLinks?: Record<string, string>; // e.g., { facebook: "url", twitter: "url" }
  createdAt: Date;
  updatedAt: Date;
}