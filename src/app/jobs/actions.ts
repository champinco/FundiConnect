
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getAllJobsFromFirestore as getAllJobsFromFirestoreService, createJobInFirestore as createJobInFirestoreService } from '@/services/jobService';
import { searchJobsAction as searchClientJobsAction } from '@/app/search/actions'; 
import type { Job } from '@/models/job';
import type { PostJobFormValues } from './post/schemas';


interface PostJobResult {
  success: boolean;
  message: string;
  jobId?: string;
}

export async function postJobAction(
  values: PostJobFormValues,
  clientIdFromFrontend: string | null,
  photoUrls?: string[]
): Promise<PostJobResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[postJobAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }

  let actualClientId: string | null = clientIdFromFrontend;
  console.log('[postJobAction] Auth state info from client (used for clientId):', { uid: clientIdFromFrontend });

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
      otherCategoryDescription: values.serviceCategory === 'Other' ? values.otherCategoryDescription : undefined,
      location: values.location,
      status: 'open', // Default status for new jobs
      photosOrVideos: photoUrls || [],
      budget: values.budget,
      urgency: values.urgency,
      deadline: values.deadline ? new Date(values.deadline) : null // Ensure deadline is Date or null
    };

    console.log('[postJobAction] Data prepared for job creation:', JSON.stringify(jobDataForService));
    const jobId = await createJobInFirestoreService(jobDataForService);
    return { success: true, message: "Job posted successfully!", jobId };
  } catch (error: any) {
    console.error(`[postJobAction] Error posting job. ClientID: ${actualClientId}, Values: ${JSON.stringify(values)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to post job: ${error.message}.` };
  }
}


export async function fetchAllJobsAction(limit?: number): Promise<Job[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchAllJobsAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot fetch all jobs.");
  }
  try {
    console.log("[fetchAllJobsAction] Fetching all open/pending_quotes jobs from service.");
    // The service function already filters for open/pending_quotes
    const jobs = await getAllJobsFromFirestoreService(limit); 
    return jobs;
  } catch (error: any) {
    console.error(`[fetchAllJobsAction] Error. Limit: ${limit}. Error:`, error.message, error.stack, error.code);
    throw new Error(`Failed to fetch all jobs: ${error.message}.`);
  }
}

export async function fetchMyClientJobsAction(userId: string): Promise<Job[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchMyClientJobsAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot fetch client jobs.");
  }
  if (!userId) {
    console.error("[fetchMyClientJobsAction] User ID is required.");
    throw new Error("User ID is required to fetch client jobs.");
  }
  try {
    console.log(`[fetchMyClientJobsAction] Fetching jobs for client ${userId} using searchJobsAction.`);
    // Use existing searchJobsAction which has robust filtering including by clientId
    const jobs = await searchClientJobsAction({
      isMyJobsSearch: true,
      currentUserId: userId,
      filterByStatus: 'all_my' // This tells searchJobsAction to get all statuses for this client
    });
    return jobs;
  } catch (error: any) {
    console.error(`[fetchMyClientJobsAction] Error fetching jobs for client ${userId}. Error:`, error.message, error.stack, error.code);
    throw new Error(`Failed to fetch client jobs: ${error.message}.`);
  }
}
