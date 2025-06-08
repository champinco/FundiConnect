
"use server";

import { z } from 'zod';
import { createJobInFirestore } from '@/services/jobService';
import type { Job } from '@/models/job';
import type { ServiceCategory } from '@/components/service-category-icon';
import { auth } from '@/lib/firebase'; // To get current user, though not fully used here yet

// Tier 1 services + Other for job posting, must match service-category-icon.tsx
const serviceCategoriesForValidation: [ServiceCategory, ...ServiceCategory[]] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
  'HVAC',
  'Solar Installation',
  'Painting & Decorating',
  'Carpentry & Furniture',
  'Landscaping',
  'Tiling & Masonry',
  'Pest Control',
  'Locksmith',
  'Other'
];


export const postJobFormSchema = z.object({
  jobTitle: z.string().min(5, { message: "Job title must be at least 5 characters." }).max(100),
  serviceCategory: z.enum(serviceCategoriesForValidation, { errorMap: () => ({ message: "Please select a valid service category."})}),
  jobDescription: z.string().min(20, { message: "Description must be at least 20 characters." }).max(2000),
  location: z.string().min(3, { message: "Location is required." }).max(100),
  postingOption: z.enum(['public', 'direct']),
});

export type PostJobFormValues = z.infer<typeof postJobFormSchema>;

interface PostJobResult {
  success: boolean;
  message: string;
  jobId?: string;
}

export async function postJobAction(
  values: PostJobFormValues, 
  clientId: string | null,
  photoUrls?: string[]
): Promise<PostJobResult> {
  if (!clientId) {
    return { success: false, message: "User not authenticated. Cannot post job." };
  }

  try {
    const jobData: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'> = {
      clientId: clientId,
      title: values.jobTitle,
      description: values.jobDescription,
      serviceCategory: values.serviceCategory,
      location: values.location,
      status: 'open', // Default status for new jobs
      photosOrVideos: photoUrls, 
    };

    const jobId = await createJobInFirestore(jobData);

    return { success: true, message: "Job posted successfully!", jobId };
  } catch (error: any) {
    console.error("Post Job Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred while posting the job." };
  }
}
