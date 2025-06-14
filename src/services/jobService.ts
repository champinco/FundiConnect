
/**
 * @fileOverview Service functions for interacting with job data in Firestore.
 */
import { adminDb, AdminTimestamp, AdminFieldValue } from '@/lib/firebaseAdmin'; // Use Admin SDK
import type { Job, JobStatus } from '@/models/job';
import type { UpdateData } from 'firebase-admin/firestore';

/**
 * Creates a new job document in Firestore using Admin SDK.
 * @param jobData - The job data object, omitting id, postedAt, updatedAt.
 * @returns A promise that resolves with the ID of the newly created job.
 */
export async function createJobInFirestore(jobData: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'>): Promise<string> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Job creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const now = AdminFieldValue.serverTimestamp();
    const jobsCollectionRef = adminDb.collection('jobs');

    const dataToSave: any = {
      clientId: jobData.clientId,
      title: jobData.title?.trim(),
      description: jobData.description?.trim(),
      serviceCategory: jobData.serviceCategory,
      location: jobData.location?.trim(),
      status: jobData.status || 'open',
      photosOrVideos: jobData.photosOrVideos || [],
      postedAt: now,
      updatedAt: now,
      quotesReceived: 0,
      assignedProviderId: jobData.assignedProviderId || null,
      deadline: jobData.deadline ? AdminTimestamp.fromDate(new Date(jobData.deadline)) : null,
      acceptedQuoteId: jobData.acceptedQuoteId || null,
    };

    if (jobData.budget !== undefined && jobData.budget !== null) {
      dataToSave.budget = parseFloat(String(jobData.budget));
      if (isNaN(dataToSave.budget)) dataToSave.budget = null;
    } else {
      dataToSave.budget = null;
    }

    if (jobData.urgency !== undefined && jobData.urgency !== null) {
      dataToSave.urgency = jobData.urgency;
    } else {
      dataToSave.urgency = null;
    }

    if (jobData.otherCategoryDescription) {
      dataToSave.otherCategoryDescription = jobData.otherCategoryDescription.trim();
    }
    if (jobData.budgetRange && (jobData.budgetRange.min != null || jobData.budgetRange.max != null)) {
      dataToSave.budgetRange = jobData.budgetRange;
    }

    console.log('Job data being sent to Firestore (via Admin SDK):', {
      ...dataToSave,
      postedAt: '[SERVER_TIMESTAMP]',
      updatedAt: '[SERVER_TIMESTAMP]',
      deadline: dataToSave.deadline ? '[CONVERTED_TIMESTAMP]' : null,
    });

    const docRef = await jobsCollectionRef.add(dataToSave);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating job in Firestore (Admin SDK). Original error:', error);
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
 * Retrieves a job document from Firestore by its ID using Admin SDK.
 * @param jobId - The ID of the job to retrieve.
 * @returns A promise that resolves with the Job object or null if not found.
 */
export async function getJobByIdFromFirestore(jobId: string): Promise<Job | null> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch job by ID.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const jobRef = adminDb.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();

    if (jobSnap.exists) {
      const jobData = jobSnap.data()!;
      return {
        ...jobData,
        id: jobSnap.id,
        postedAt: (jobData.postedAt as admin.firestore.Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as admin.firestore.Timestamp)?.toDate(),
        deadline: (jobData.deadline as admin.firestore.Timestamp)?.toDate() || null,
      } as Job;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching job by ID from Firestore (Admin SDK):', error);
    throw new Error('Could not fetch job by ID.');
  }
}

/**
 * Retrieves jobs posted by a specific client using Admin SDK.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getJobsByClientIdFromFirestore(clientId: string): Promise<Job[]> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch jobs by client ID.");
    throw new Error("Server error: Admin DB not initialized.");
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
        postedAt: (jobData.postedAt as admin.firestore.Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as admin.firestore.Timestamp)?.toDate(),
        deadline: (jobData.deadline as admin.firestore.Timestamp)?.toDate() || null,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs by client ID (Admin SDK):', error);
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
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot update job status.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const jobRef = adminDb.collection('jobs').doc(jobId);
  const updateData: UpdateData<Job> = { // Using UpdateData for type safety
    status: newStatus,
    updatedAt: AdminFieldValue.serverTimestamp() as admin.firestore.Timestamp,
  };

  if (newStatus === 'assigned' && assignedProviderId) {
    updateData.assignedProviderId = assignedProviderId;
  } else if (newStatus === 'open') {
    updateData.assignedProviderId = null;
  }

  try {
    await jobRef.update(updateData);
  } catch (error) {
    console.error(`Error updating job ${jobId} to status ${newStatus} (Admin SDK):`, error);
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
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot get job summary.");
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
      if (job.status === 'open') summary.open++;
      else if (job.status === 'assigned') summary.assigned++;
      else if (job.status === 'in_progress') summary.inProgress++;
      else if (job.status === 'completed') summary.completed++;
    });
    return summary;
  } catch (error) {
    console.error('Error fetching job summary for client (Admin SDK):', error);
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
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot get assigned jobs.");
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
        postedAt: (jobData.postedAt as admin.firestore.Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as admin.firestore.Timestamp)?.toDate(),
        deadline: (jobData.deadline as admin.firestore.Timestamp)?.toDate() || null,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('Error fetching assigned jobs for provider (Admin SDK):', error);
    return [];
  }
}
