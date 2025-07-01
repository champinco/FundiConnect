
import { z } from 'zod';
import { serviceCategoriesForValidation } from '@/app/jobs/post/schemas';
import type { ServiceCategory } from '@/components/service-category-icon';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];


export const certificationSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  name: z.string().min(2, "Certification name is required."),
  number: z.string().min(1, "Certification number is required."),
  issuingBody: z.string().min(2, "Issuing body is required."),
  issueDate: z.date().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
  newDocumentFile: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max document file size is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_DOC_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp, and .pdf formats are supported for documents."
    ).optional().nullable(),
  status: z.enum(['pending_review', 'verified', 'requires_attention', 'expired', 'not_applicable']).optional().default('pending_review'),
  verificationNotes: z.string().optional().nullable(),
});

export const portfolioItemSchema = z.object({
    id: z.string().uuid().or(z.string().min(1)),
    description: z.string().min(3, "Portfolio item description must be at least 3 characters.").max(500, "Description too long."),
    imageUrl: z.string().url().optional().nullable(), // Existing image URL
    newImageFile: z
        .custom<File | null | undefined>()
        .refine(
            (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
            `Max portfolio image size is ${MAX_FILE_SIZE_MB}MB.`
        )
        .refine(
            (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
            "Only .jpg, .jpeg, .png, .webp formats are supported for portfolio images."
        ).optional().nullable(),
    dataAiHint: z.string().max(50, "AI hint too long (max 50 chars).").optional().nullable(), 
});


export const providerProfileEditFormSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters."),
  mainService: z.string().min(3, { message: "Main service is required (min 3 characters)." }),
  otherMainServiceDescription: z.string().optional(),
  specialties: z.string().optional()
    .transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
  skills: z.string().optional()
    .transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
  bio: z.string().min(20, "Bio must be at least 20 characters.").max(1500, "Bio cannot exceed 1500 characters."),
  location: z.string().min(3, "Primary location is required."),
  fullAddress: z.string().optional().nullable(),
  yearsOfExperience: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0, "Years of experience cannot be negative.")
  ),
  contactPhoneNumber: z.string().regex(/^\+?[0-9\s-()]{7,20}$/, "Please enter a valid phone number."),
  operatingHours: z.string().optional().nullable(),
  serviceAreas: z.string().optional()
    .transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s.length > 0) : []),
  website: z.string().url("Please enter a valid URL for your website.").optional().or(z.literal('')),

  // Social Media Links
  twitterUrl: z.string().url("Please enter a valid Twitter URL.").optional().or(z.literal('')),
  instagramUrl: z.string().url("Please enter a valid Instagram URL.").optional().or(z.literal('')),
  facebookUrl: z.string().url("Please enter a valid Facebook URL.").optional().or(z.literal('')),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL.").optional().or(z.literal('')),

  profilePictureUrl: z.string().url().optional().nullable(),
  bannerImageUrl: z.string().url().optional().nullable(),

  newProfilePictureFile: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp formats are supported for profile picture."
    ).optional().nullable(),

  newBannerImageFile: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp formats are supported for banner image."
    ).optional().nullable(),

  certifications: z.array(certificationSchema).optional(),
  portfolio: z.array(portfolioItemSchema).optional(), 
  unavailableDates: z.array(z.date()).optional().default([]),
  receivesEmergencyJobAlerts: z.boolean().optional().default(false),
});

export type ProviderProfileEditFormValues = z.infer<typeof providerProfileEditFormSchema>;
export type CertificationFormValues = z.infer<typeof certificationSchema>;
export type PortfolioItemFormValues = z.infer<typeof portfolioItemSchema>;

export const allServiceCategories: ServiceCategory[] = [...serviceCategoriesForValidation];
