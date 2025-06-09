
"use server";

import { createJobInFirestore } from '@/services/jobService';
import type { Job } from '@/models/job';
import type { PostJobFormValues } from './schemas'; // Updated import

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
      photosOrVideos: photoUrls || [], // Ensure it's an array, even if empty
    };

    const jobId = await createJobInFirestore(jobData);

    return { success: true, message: "Job posted successfully!", jobId };
  } catch (error: any) {
    console.error("Post Job Action Error:", error);
    // The service function createJobInFirestore already throws a specific error.
    // We can either re-throw it or return its message.
    return { success: false, message: error.message || "An unexpected error occurred while posting the job." };
  }
}

