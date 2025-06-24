
/**
 * @fileOverview Service functions for interacting with job data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin'; 
import { Timestamp, FieldValue, type UpdateData, type Query } from 'firebase-admin/firestore';
import type { Job, JobStatus, JobUrgency } from '@/models/job';
import type { PostJobFormValues } from '@/app/jobs/post/schemas';
import { serviceCategoriesForValidation } from '@/app/jobs/post/schemas';
import type { ServiceCategory } from '@/components/service-category-icon';

/**
 * Creates a new job document in Firestore using Admin SDK.
 * @param jobData - The job data object, omitting id, postedAt, updatedAt.
 * @returns A promise that resolves with the ID of the newly created job.
 */
export async function createJobInFirestore(jobData: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'>): Promise<string> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[createJobInFirestore] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
  try {
    const now = FieldValue.serverTimestamp();
    const jobsCollectionRef = adminDb.collection('jobs');

    const dataToSave: any = {
      clientId: jobData.clientId,
      title: jobData.title?.trim(),
      description: jobData.description?.trim(),
      serviceCategory: jobData.serviceCategory,
      otherCategoryDescription: jobData.serviceCategory === 'Other' && jobData.otherCategoryDescription ? jobData.otherCategoryDescription.trim() : null,
      location: jobData.location?.trim(),
      status: jobData.status || 'open',
      photosOrVideos: jobData.photosOrVideos || [],
      postedAt: now,
      updatedAt: now,
      quotesReceived: 0,
      assignedProviderId: jobData.assignedProviderId || null,
      deadline: jobData.deadline ? Timestamp.fromDate(new Date(jobData.deadline)) : null,
      urgency: jobData.urgency || 'medium', 
      acceptedQuoteId: jobData.acceptedQuoteId || null,
    };

    if (jobData.budget !== undefined && jobData.budget !== null) {
      dataToSave.budget = parseFloat(String(jobData.budget));
      if (isNaN(dataToSave.budget)) dataToSave.budget = null;
    } else {
      dataToSave.budget = null;
    }

    if (jobData.budgetRange && (jobData.budgetRange.min != null || jobData.budgetRange.max != null)) {
      dataToSave.budgetRange = jobData.budgetRange;
    }

    console.log('[createJobInFirestore] Data prepared for job creation:', JSON.stringify(dataToSave, (key, value) => {
        if (value && value._delegate && value._delegate.constructor.name === 'FieldValue') {
          return '[SERVER_TIMESTAMP]';
        }
        return value;
      }, 2));


    const docRef = await jobsCollectionRef.add(dataToSave);
    return docRef.id;
  } catch (error: any) {
    console.error('[createJobInFirestore] Error creating job in Firestore (Admin SDK). Original error:', error.message, error.stack, error.code);
    let message = 'Could not create job.';
    if (error.code === 'permission-denied') {
      message = 'Permission denied by Firestore rules (Admin SDK). This is unexpected.';
    } else if (error.code === 'invalid-argument') {
      message = `Invalid data provided for job creation: ${error.message}`;
    } else if (error.message) {
      message = `Failed to create job in Firestore (Admin SDK). Details: ${error.message}`;
    }
    throw new Error(message);
  }
}

/**
 * Updates an existing job document in Firestore.
 * @param jobId The ID of the job to update.
 * @param jobData The data to update.
 */
export async function updateJob(jobId: string, jobData: Partial<PostJobFormValues> & { photosOrVideos?: string[] }): Promise<void> {
  if (!adminDb) {
    throw new Error('Server error: Database not initialized.');
  }

  const isKnownCategory = (serviceCategoriesForValidation as readonly string[]).includes(jobData.serviceCategory || '');
  const finalServiceCategory = isKnownCategory ? jobData.serviceCategory as ServiceCategory : 'Other';
  const finalOtherDescription = isKnownCategory ? null : jobData.serviceCategory;

  const updatePayload: any = {
    title: jobData.jobTitle,
    description: jobData.jobDescription,
    serviceCategory: finalServiceCategory,
    otherCategoryDescription: finalOtherDescription,
    location: jobData.location,
    budget: jobData.budget ? Number(jobData.budget) : null,
    urgency: jobData.urgency as JobUrgency,
    deadline: jobData.deadline ? new Date(jobData.deadline) : null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  
  if (jobData.photosOrVideos) {
    updatePayload.photosOrVideos = jobData.photosOrVideos;
  }

  const jobRef = adminDb.collection('jobs').doc(jobId);
  await jobRef.update(updatePayload);
}

/**
 * Deletes a job document from Firestore.
 * @param jobId The ID of the job to delete.
 */
export async function deleteJob(jobId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Server error: Database not initialized.');
  }
  const jobRef = adminDb.collection('jobs').doc(jobId);
  await jobRef.delete();
}

/**
 * Retrieves a job document from Firestore by its ID using Admin SDK.
 * @param jobId - The ID of the job to retrieve.
 * @returns A promise that resolves with the Job object or null if not found.
 */
export async function getJobByIdFromFirestore(jobId: string): Promise<Job | null> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getJobByIdFromFirestore] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
  try {
    const jobRef = adminDb.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (jobSnap.exists) {
      const jobData = jobSnap.data()!;
      return {
        ...jobData,
        id: jobSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: jobData.deadline ? (jobData.deadline as Timestamp).toDate() : null,
        urgency: jobData.urgency || 'medium', 
        otherCategoryDescription: jobData.otherCategoryDescription || undefined,
      } as Job;
    } else {
      return null;
    }
  } catch (error) {
    console.error('[getJobByIdFromFirestore] Error fetching job by ID from Firestore (Admin SDK):', error);
    throw new Error('Could not fetch job by ID.');
  }
}

/**
 * Retrieves jobs posted by a specific client using Admin SDK.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getJobsByClientIdFromFirestore(clientId: string): Promise<Job[]> {
   if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getJobsByClientIdFromFirestore] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
  try {
    const jobsRef = adminDb.collection('jobs');
    const q = jobsRef.where('clientId', '==', clientId).orderBy('postedAt', 'desc');
    const querySnapshot = await q.get();
    const jobs: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      jobs.push({
        ...jobData,
        id: docSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: jobData.deadline ? (jobData.deadline as Timestamp).toDate() : null,
        urgency: jobData.urgency || 'medium',
        otherCategoryDescription: jobData.otherCategoryDescription || undefined,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('[getJobsByClientIdFromFirestore] Error fetching jobs by client ID (Admin SDK):', error);
    throw new Error('Could not fetch jobs for client.');
  }
}

/**
 * Updates the status of a job and optionally assigns a provider using Admin SDK.
 * @param jobId The ID of the job to update.
 * @param newStatus The new status for the job.
 * @param assignedProviderId Optional. The UID of the provider if the job is being assigned.
 */
export async function updateJobStatus(jobId: string, newStatus: JobStatus, assignedProviderId?: string | null): Promise<void> {
   if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[updateJobStatus] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
  const jobRef = adminDb.collection('jobs').doc(jobId);
  const updateData: UpdateData<Job> = {
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp() as Timestamp, 
  };

  if (newStatus === 'assigned' && assignedProviderId) {
    updateData.assignedProviderId = assignedProviderId;
  } else if (newStatus === 'open' || newStatus === 'cancelled') { 
    updateData.assignedProviderId = FieldValue.delete() as unknown as string | null; 
  }


  try {
    await jobRef.update(updateData);
  } catch (error) {
    console.error(`[updateJobStatus] Error updating job ${jobId} to status ${newStatus} (Admin SDK):`, error);
    throw new Error(`Could not update job status.`);
  }
}

export interface ClientJobSummary {
  open: number;
  assigned: number;
  inProgress: number;
  completed: number;
  total: number;
}

/**
 * Retrieves a summary of job counts for a specific client using Admin SDK.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with a ClientJobSummary object.
 */
export async function getJobSummaryForClient(clientId: string): Promise<ClientJobSummary> {
   if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getJobSummaryForClient] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    return { open: 0, assigned: 0, inProgress: 0, completed: 0, total: 0 };
  }
  const summary: ClientJobSummary = {
    open: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  };
  try {
    const jobsRef = adminDb.collection('jobs');
    const q = jobsRef.where('clientId', '==', clientId);
    const querySnapshot = await q.get();

    querySnapshot.forEach((docSnap) => {
      const job = docSnap.data() as Job;
      summary.total++;
      if (job.status === 'open' || job.status === 'pending_quotes') summary.open++;
      else if (job.status === 'assigned') summary.assigned++;
      else if (job.status === 'in_progress') summary.inProgress++;
      else if (job.status === 'completed') summary.completed++;
    });
    return summary;
  } catch (error) {
    console.error('[getJobSummaryForClient] Error fetching job summary for client (Admin SDK):', error);
    return summary;
  }
}

/**
 * Retrieves currently assigned jobs for a provider using Admin SDK.
 * @param providerId - The UID of the provider.
 * @param limitCount - The maximum number of jobs to fetch.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getAssignedJobsForProvider(providerId: string, limitCount: number = 3): Promise<Job[]> {
   if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getAssignedJobsForProvider] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    return [];
  }
  try {
    const jobsRef = adminDb.collection('jobs');
    const q = jobsRef
      .where('assignedProviderId', '==', providerId)
      .where('status', 'in', ['assigned', 'in_progress'])
      .orderBy('updatedAt', 'desc')
      .limit(limitCount);
    const querySnapshot = await q.get();
    const jobs: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      jobs.push({
        ...jobData,
        id: docSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: jobData.deadline ? (jobData.deadline as Timestamp).toDate() : null,
        urgency: jobData.urgency || 'medium',
        otherCategoryDescription: jobData.otherCategoryDescription || undefined,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('[getAssignedJobsForProvider] Error fetching assigned jobs for provider (Admin SDK):', error);
    return [];
  }
}

/**
 * Retrieves all jobs from Firestore, intended for general browsing, using Admin SDK.
 * Filters for 'open' or 'pending_quotes' statuses by default.
 * @param limitCount - The maximum number of jobs to fetch. Defaults to 50.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getAllJobsFromFirestore(limitCount: number = 50): Promise<Job[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getAllJobsFromFirestore] CRITICAL: Firebase Admin DB not initialized. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot fetch all jobs.");
  }
  try {
    const jobsRef = adminDb.collection('jobs');
    const q: Query = jobsRef
      .where('status', 'in', ['open', 'pending_quotes']) 
      .orderBy('postedAt', 'desc')
      .limit(limitCount);

    const querySnapshot = await q.get();
    const jobs: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      const postedAt = (jobData.postedAt as Timestamp)?.toDate();
      const updatedAt = (jobData.updatedAt as Timestamp)?.toDate();
      const deadline = jobData.deadline ? (jobData.deadline as Timestamp).toDate() : null;

      jobs.push({
        id: docSnap.id,
        ...jobData,
        postedAt,
        updatedAt,
        deadline,
        urgency: jobData.urgency || 'medium',
        otherCategoryDescription: jobData.otherCategoryDescription || undefined,
      } as Job);
    });
    console.log(`[getAllJobsFromFirestore] Fetched ${jobs.length} jobs for browsing.`);
    return jobs;
  } catch (error: any) {
    console.error('[getAllJobsFromFirestore] Error fetching all jobs from Firestore (Admin SDK):', error.message, error.stack);
    if (error.message && error.message.includes('FAILED_PRECONDITION') && error.message.includes('index')) {
        console.error("[getAllJobsFromFirestore] Firestore query requires a composite index. Please create it in the Firebase console. The error message should contain a link to create it.");
        throw new Error(`Query requires a Firestore index. Please check server logs for a link to create it. Original: ${error.message}`);
    }
    throw new Error('Could not fetch all jobs from Firestore.');
  }
}
