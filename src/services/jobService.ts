
/**
 * @fileOverview Service functions for interacting with job data in Firestore.
 */
import { collection, addDoc, getDoc, doc, query, where, getDocs, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
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
    const jobWithTimestamps = {
      ...jobData,
      postedAt: now,
      updatedAt: now,
      quotesReceived: 0, // Initialize quotesReceived
      status: jobData.status || 'open', // Default status
    };
    const docRef = await addDoc(collection(db, 'jobs'), jobWithTimestamps);
    return docRef.id;
  } catch (error) {
    console.error('Error creating job in Firestore:', error);
    throw new Error('Could not create job.');
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
