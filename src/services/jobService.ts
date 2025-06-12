
/**
 * @fileOverview Service functions for interacting with job data in Firestore.
 */
import { collection, addDoc, getDoc, doc, query, where, getDocs, serverTimestamp, Timestamp, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Job, JobStatus } from '@/models/job';

/**
 * Creates a new job document in Firestore.
 * @param jobData - The job data object, omitting id, postedAt, updatedAt.
 * @returns A promise that resolves with the ID of the newly created job.
 */
export async function createJobInFirestore(jobData: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'>): Promise<string> {
  try {
    const now = serverTimestamp();

    // Explicitly construct the object to be saved to Firestore
    const dataToSave: any = {
      clientId: jobData.clientId,
      title: jobData.title,
      description: jobData.description,
      serviceCategory: jobData.serviceCategory,
      location: jobData.location,
      status: jobData.status || 'open', // Default status
      photosOrVideos: jobData.photosOrVideos || [], // Default to empty array

      // Timestamps and initial counts
      postedAt: now,
      updatedAt: now,
      quotesReceived: 0,

      // Handle optional fields explicitly, defaulting to null or omitting if not provided
      assignedProviderId: jobData.assignedProviderId || null,
      deadline: jobData.deadline || null,
      acceptedQuoteId: jobData.acceptedQuoteId || null,
    };

    // Add new optional fields if they exist in jobData
    if (jobData.budget !== undefined && jobData.budget !== null) {
      dataToSave.budget = jobData.budget;
    }
    if (jobData.urgency !== undefined && jobData.urgency !== null) {
      dataToSave.urgency = jobData.urgency;
    }

    // For fields that are purely optional (e.g., `otherCategoryDescription?: string` or `budgetRange?: object`)
    // only add them if they have a value.
    if (jobData.otherCategoryDescription) {
      dataToSave.otherCategoryDescription = jobData.otherCategoryDescription;
    }
    // Keep budgetRange logic if it's still intended to be used alongside or instead of numeric budget
    if (jobData.budgetRange && (jobData.budgetRange.min != null || jobData.budgetRange.max != null)) {
      dataToSave.budgetRange = jobData.budgetRange;
    }


    const docRef = await addDoc(collection(db, 'jobs'), dataToSave);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating job in Firestore. Original error:', error); // Log the full original error
    // Throw a new error that includes the original error's message for better client-side debugging
    throw new Error(`Failed to create job in Firestore. Details: ${error.message || 'Unknown Firestore error'}`);
  }
}

/**
 * Retrieves a job document from Firestore by its ID.
 * @param jobId - The ID of the job to retrieve.
 * @returns A promise that resolves with the Job object or null if not found.
 */
export async function getJobByIdFromFirestore(jobId: string): Promise<Job | null> {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (jobSnap.exists()) {
      const jobData = jobSnap.data();
      return {
        ...jobData,
        id: jobSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: (jobData.deadline as Timestamp)?.toDate() || null,
        // budget will be number | null | undefined
        // urgency will be string | null | undefined
      } as Job;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching job by ID from Firestore:', error);
    throw new Error('Could not fetch job by ID.');
  }
}

/**
 * Retrieves jobs posted by a specific client.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getJobsByClientIdFromFirestore(clientId: string): Promise<Job[]> {
  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('clientId', '==', clientId), orderBy('postedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      jobs.push({
        ...jobData,
        id: docSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: (jobData.deadline as Timestamp)?.toDate() || null,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('Error fetching jobs by client ID:', error);
    throw new Error('Could not fetch jobs for client.');
  }
}

/**
 * Updates the status of a job and optionally assigns a provider.
 * @param jobId The ID of the job to update.
 * @param newStatus The new status for the job.
 * @param assignedProviderId Optional. The UID of the provider if the job is being assigned.
 */
export async function updateJobStatus(jobId: string, newStatus: JobStatus, assignedProviderId?: string | null): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  const updateData: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (newStatus === 'assigned' && assignedProviderId) {
    updateData.assignedProviderId = assignedProviderId;
  } else if (newStatus === 'open') { // If reopening, clear assigned provider
    updateData.assignedProviderId = null;
  }

  try {
    await updateDoc(jobRef, updateData);
  } catch (error) {
    console.error(`Error updating job ${jobId} to status ${newStatus}:`, error);
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
 * Retrieves a summary of job counts for a specific client.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with a ClientJobSummary object.
 */
export async function getJobSummaryForClient(clientId: string): Promise<ClientJobSummary> {
  const summary: ClientJobSummary = {
    open: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  };
  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);

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
    console.error('Error fetching job summary for client:', error);
    // Return default summary on error or throw
    return summary;
  }
}

/**
 * Retrieves currently assigned jobs for a provider.
 * @param providerId - The UID of the provider.
 * @param limitCount - The maximum number of jobs to fetch.
 * @returns A promise that resolves with an array of Job objects.
 */
export async function getAssignedJobsForProvider(providerId: string, limitCount: number = 3): Promise<Job[]> {
  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('assignedProviderId', '==', providerId),
      where('status', 'in', ['assigned', 'in_progress']), // Active jobs
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      jobs.push({
        ...jobData,
        id: docSnap.id,
        postedAt: (jobData.postedAt as Timestamp)?.toDate(),
        updatedAt: (jobData.updatedAt as Timestamp)?.toDate(),
        deadline: (jobData.deadline as Timestamp)?.toDate() || null,
      } as Job);
    });
    return jobs;
  } catch (error) {
    console.error('Error fetching assigned jobs for provider:', error);
    return [];
  }
}
