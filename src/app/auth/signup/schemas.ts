
import { z } from 'zod';
import { serviceCategoriesForValidation } from '@/app/jobs/post/schemas'; // Re-use for mainService

const MAX_FILE_SIZE_MB = 5; // Max file size for profile/banner images
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];


export const signupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
  accountType: z.enum(['client', 'provider']),
  // Provider specific fields - conditionally required
  businessName: z.string().optional(),
  mainService: z.enum(serviceCategoriesForValidation).optional(),
  providerLocation: z.string().optional(), 
  contactPhoneNumber: z.string().optional(),
  yearsOfExperience: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val) : undefined),
    z.number().min(0, "Years of experience cannot be negative.").optional()
  ),
  bio: z.string().optional(),
  newProfilePictureFile: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size for profile picture is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp formats are supported for profile picture."
    ).optional().nullable(),
  newBannerImageFile: z
    .custom<File | null | undefined>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size for banner image is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp formats are supported for banner image."
    ).optional().nullable(),
})
.refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], 
})
.superRefine((data, ctx) => {
  if (data.accountType === 'provider') {
    if (!data.businessName || data.businessName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Business name must be at least 2 characters.",
        path: ["businessName"],
      });
    }
    if (!data.mainService) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Main service category is required.",
        path: ["mainService"],
      });
    }
    if (!data.providerLocation || data.providerLocation.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider location is required and must be at least 3 characters.",
        path: ["providerLocation"],
      });
    }
    if (!data.contactPhoneNumber || !/^\+?[0-9\s-()]{7,20}$/.test(data.contactPhoneNumber)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A valid contact phone number is required for providers.",
            path: ["contactPhoneNumber"],
        });
    }
    if (data.yearsOfExperience === undefined || data.yearsOfExperience < 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Years of experience is required and must be 0 or more.",
            path: ["yearsOfExperience"],
        });
    }
    if (!data.bio || data.bio.length < 20) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Bio is required and must be at least 20 characters.",
            path: ["bio"],
        });
    }
  }
});

// This type is for the server action, which will receive all fields.
// The client form ensures provider fields are present if accountType is provider.
export type SignupFormValues = z.infer<typeof signupFormSchema> & {
  profilePictureUrl?: string | null; 
  bannerImageUrl?: string | null;
};
