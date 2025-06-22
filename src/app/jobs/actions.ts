
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getAllJobsFromFirestore as getAllJobsFromFirestoreService, createJobInFirestore as createJobInFirestoreService } from '@/services/jobService';
import { searchJobsAction as searchClientJobsAction } from '@/app/search/actions'; 
import type { Job, JobUrgency } from '@/models/job';
import type { PostJobFormValues } from './post/schemas';
import { createNotification } from '@/services/notificationService'; // For urgent job notifications
import { getEmergencyOptedInProvidersByCategory } from '@/services/providerService'; // For urgent job notifications
import { serviceCategoriesForValidation } from './post/schemas';
import type { ServiceCategory } from '@/components/service-category-icon';


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
    const isKnownCategory = (serviceCategoriesForValidation as readonly string[]).includes(values.serviceCategory);
    const finalServiceCategory = isKnownCategory ? values.serviceCategory as ServiceCategory : 'Other';
    const finalOtherDescription = isKnownCategory ? undefined : values.serviceCategory;

    const jobDataForService: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'> = {
      clientId: actualClientId,
      title: values.jobTitle,
      description: values.jobDescription,
      serviceCategory: finalServiceCategory,
      otherCategoryDescription: finalOtherDescription,
      location: values.location,
      status: 'open', 
      photosOrVideos: photoUrls || [],
      budget: values.budget,
      urgency: values.urgency as JobUrgency, 
      deadline: values.deadline ? new Date(values.deadline) : null
    };

    console.log('[postJobAction] Data prepared for job creation:', JSON.stringify(jobDataForService));
    const jobId = await createJobInFirestoreService(jobDataForService);

    // If job is urgent, notify opted-in providers
    if (values.urgency === 'high') {
      const categoryToNotify = finalServiceCategory;
      console.log(`[postJobAction] Urgent job ${jobId} posted. Fetching opted-in providers for category ${categoryToNotify}.`);
      const optedInProviders = await getEmergencyOptedInProvidersByCategory(categoryToNotify);
      console.log(`[postJobAction] Found ${optedInProviders.length} providers opted-in for emergency alerts in category ${categoryToNotify}.`);
      for (const provider of optedInProviders) {
        // Avoid notifying the client themselves if they happen to be a provider who opted in for their own category (edge case)
        if (provider.id !== actualClientId) { 
          await createNotification({
            userId: provider.id,
            type: 'job_status_changed', 
            message: `URGENT job posted in ${values.serviceCategory}: "${values.jobTitle.substring(0, 30)}..." in ${values.location}.`,
            relatedEntityId: jobId,
            link: `/jobs/${jobId}`
          });
        }
      }
      console.log(`[postJobAction] Sent notifications for urgent job ${jobId} to ${optedInProviders.filter(p => p.id !== actualClientId).length} providers.`);
    }

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
    const jobResult = await searchClientJobsAction({ // Corrected: expect JobSearchResult
      isMyJobsSearch: true,
      currentUserId: userId,
      filterByStatus: 'all_my' 
    });
    return jobResult.jobs; // Extract jobs array from the result
  } catch (error: any) {
    console.error(`[fetchMyClientJobsAction] Error fetching jobs for client ${userId}. Error:`, error.message, error.stack, error.code);
    throw new Error(`Failed to fetch client jobs: ${error.message}.`);
  }
}
