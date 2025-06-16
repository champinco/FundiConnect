
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getAllJobsFromFirestore, createJobInFirestore as createJobInFirestoreService } from '@/services/jobService'; // Renamed import
import { searchJobsAction } from '@/app/search/actions';
import type { Job } from '@/models/job';
import type { PostJobFormValues } from './post/schemas';


// Helper to ensure adminDb is available, although service functions should also check
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[JobActions] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

interface PostJobResult {
  success: boolean;
  message: string;
  jobId?: string;
}

// This function was previously in src/app/jobs/post/actions.ts, moving it here for consolidation
export async function postJobAction(
  values: PostJobFormValues,
  clientIdFromFrontend: string | null,
  photoUrls?: string[]
): Promise<PostJobResult> {
  ensureDbInitialized();

  let actualClientId: string | null = clientIdFromFrontend;

  console.log('[postJobAction] Auth state info from client (used for clientId):', {
    uid: clientIdFromFrontend,
  });

  if (!actualClientId) {
    console.error('[postJobAction] Job post attempt without authenticated client ID.');
    return { success: false, message: "User not authenticated. Cannot post job." };
  }

  try {
    const jobDataForService: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'> = {
      clientId: actualClientId,
      title: values.jobTitle,
      description: values.jobDescription,
      serviceCategory: values.serviceCategory,
      location: values.location,
      status: 'open',
      photosOrVideos: photoUrls || [],
      budget: values.budget,
      urgency: values.urgency,
    };

    if (values.serviceCategory === 'Other' && values.otherCategoryDescription) {
        (jobDataForService as any).otherCategoryDescription = values.otherCategoryDescription.trim();
    }


    console.log('[postJobAction] Data prepared for job creation (timestamps added by service):', {
      clientId: jobDataForService.clientId,
      title: jobDataForService.title,
      description: jobDataForService.description,
      location: jobDataForService.location,
      category: jobDataForService.serviceCategory,
      status: jobDataForService.status,
      budget: jobDataForService.budget,
      urgency: jobDataForService.urgency,
    });

    const jobId = await createJobInFirestoreService(jobDataForService);

    return { success: true, message: "Job posted successfully!", jobId };
  } catch (error: any) {
    console.error("[postJobAction] Error posting job. Client ID:", actualClientId, "Values:", JSON.stringify(values), "Error Details:", error.message, error.stack);
    let message = "An unexpected error occurred while posting the job.";
    if (error.message) {
        message = error.message.startsWith("Failed to create job") || error.message.startsWith("Permission denied") || error.message.startsWith("Invalid data")
                    ? error.message
                    : `Failed to post job: ${error.message}`;
    }
    return { success: false, message };
  }
}


export async function fetchAllJobsAction(limit?: number): Promise<Job[]> {
  ensureDbInitialized();
  try {
    const jobs = await getAllJobsFromFirestore(limit);
    return jobs;
  } catch (error: any) {
    console.error("[fetchAllJobsAction] Error: ", error.message, error.stack);
    throw new Error(error.message || "Failed to fetch all jobs.");
  }
}

export async function fetchMyClientJobsAction(userId: string): Promise<Job[]> {
  ensureDbInitialized();
  if (!userId) {
    throw new Error("User ID is required to fetch client jobs.");
  }
  try {
    const jobs = await searchJobsAction({
      isMyJobsSearch: true,
      currentUserId: userId,
      filterByStatus: 'all_my' // To get all statuses for this client
    });
    return jobs;
  } catch (error: any) {
    console.error(`[fetchMyClientJobsAction] Error fetching jobs for client ${userId}: `, error.message, error.stack);
    throw new Error(error.message || "Failed to fetch client jobs.");
  }
}
