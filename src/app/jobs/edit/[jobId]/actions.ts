
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getJobByIdFromFirestore, updateJob } from '@/services/jobService';
import type { PostJobFormValues } from '@/app/jobs/post/schemas';
import { revalidatePath } from 'next/cache';
import type { Job } from '@/models/job';

// Action to fetch job data for the edit page
export async function getJobForEditAction(jobId: string): Promise<{ job?: Job, error?: string }> {
  if (!adminDb) {
    return { error: 'Server error: Database not initialized.' };
  }
  if (!jobId) {
    return { error: 'Job ID is missing.' };
  }

  try {
    const job = await getJobByIdFromFirestore(jobId);
    if (!job) {
      return { error: 'Job not found.' };
    }
    return { job };
  } catch (error: any) {
    console.error(`[getJobForEditAction] Error fetching job ${jobId}:`, error);
    return { error: `Failed to fetch job data: ${error.message}` };
  }
}

// Action to update the job
export async function updateJobAction(
  jobId: string,
  values: PostJobFormValues,
  photoUrls?: string[]
): Promise<{ success: boolean; message: string; jobId?: string }> {
  if (!adminDb) {
    return { success: false, message: 'Server error: Database not initialized.' };
  }

  try {
    const dataToUpdate = {
        ...values,
        photosOrVideos: photoUrls
    };

    await updateJob(jobId, dataToUpdate);

    // Revalidate paths to reflect the change in the UI
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath('/jobs/my-jobs');

    return { success: true, message: 'Job updated successfully!', jobId };
  } catch (error: any) {
    console.error(`[updateJobAction] Error updating job ${jobId}:`, error);
    return { success: false, message: `Failed to update job: ${error.message}` };
  }
}
