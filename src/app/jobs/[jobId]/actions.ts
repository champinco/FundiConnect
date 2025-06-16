
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { submitQuoteForJob, type SubmitQuoteData, updateQuoteStatus, getQuoteById, getQuotesForJob } from '@/services/quoteService';
import { updateJobStatus, getJobByIdFromFirestore } from '@/services/jobService';
import type { Quote, QuoteStatus } from '@/models/quote';
import type { Job, JobStatus } from '@/models/job';
import { submitReview, type ReviewData, getReviewForJobByClient } from '@/services/reviewService';
import type { User as AppUser } from '@/models/user';
import { getUserProfileFromFirestore } from '@/services/userService';


// Helper to ensure adminDb is available - though individual actions will check again
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[JobActionsFileLevel] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

interface SubmitQuoteResult {
  success: boolean;
  message: string;
  quoteId?: string;
}

export async function submitQuoteAction(
  data: Omit<SubmitQuoteData, 'providerId'> & { providerId: string }
): Promise<SubmitQuoteResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[submitQuoteAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  try {
    const quoteDataForService: SubmitQuoteData = {
      jobId: data.jobId,
      providerId: data.providerId,
      clientId: data.clientId,
      amount: data.amount,
      currency: data.currency,
      messageToClient: data.messageToClient,
    };

    const quoteId = await submitQuoteForJob(quoteDataForService);
    return { success: true, message: "Quote submitted successfully!", quoteId };
  } catch (error: any) {
    console.error(`[submitQuoteAction] Error. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to submit quote: ${error.message}.` };
  }
}


interface UpdateQuoteStatusResult {
  success: boolean;
  message: string;
}

export async function acceptQuoteAction(jobId: string, quoteId: string, providerIdToAssign: string): Promise<UpdateQuoteStatusResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[acceptQuoteAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  try {
    const quoteToAccept = await getQuoteById(quoteId);
    if (!quoteToAccept) {
        return { success: false, message: "Quote not found." };
    }
    if (quoteToAccept.status !== 'pending') {
        return { success: false, message: "Quote is no longer pending and cannot be accepted." };
    }
    if (quoteToAccept.jobId !== jobId) {
        return { success: false, message: "Quote does not belong to this job." };
    }

    await updateQuoteStatus(quoteId, 'accepted');
    await updateJobStatus(jobId, 'assigned', providerIdToAssign);
    
    return { success: true, message: "Quote accepted and job assigned!" };
  } catch (error: any) {
    console.error(`[acceptQuoteAction] Error. JobId: ${jobId}, QuoteId: ${quoteId}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to accept quote: ${error.message}.` };
  }
}

export async function rejectQuoteAction(quoteId: string): Promise<UpdateQuoteStatusResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[rejectQuoteAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  try {
    const quoteToReject = await getQuoteById(quoteId);
    if (!quoteToReject) {
        return { success: false, message: "Quote not found." };
    }
    if (quoteToReject.status !== 'pending') {
        return { success: false, message: "Quote is no longer pending and cannot be rejected." };
    }
    
    await updateQuoteStatus(quoteId, 'rejected');
    return { success: true, message: "Quote rejected." };
  } catch (error: any) {
    console.error(`[rejectQuoteAction] Error. QuoteId: ${quoteId}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to reject quote: ${error.message}.` };
  }
}


interface SubmitReviewResult {
  success: boolean;
  message: string;
  reviewId?: string;
}
export async function submitReviewAction(data: ReviewData): Promise<SubmitReviewResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[submitReviewAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  try {
    const reviewId = await submitReview(data);
    return { success: true, message: "Review submitted successfully!", reviewId };
  } catch (error: any) {
    console.error(`[submitReviewAction] Error. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to submit review: ${error.message}.` };
  }
}

interface MarkJobAsCompletedResult {
  success: boolean;
  message: string;
}

export async function markJobAsCompletedAction(jobId: string, expectedClientId: string): Promise<MarkJobAsCompletedResult> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[markJobAsCompletedAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { success: false, message: "Server error: Core database service unavailable." };
  }
  try {
    const job = await getJobByIdFromFirestore(jobId);
    if (!job) {
      return { success: false, message: "Job not found." };
    }
    if (job.clientId !== expectedClientId) {
        return { success: false, message: "You are not authorized to mark this job as completed." };
    }
    if (job.status !== 'assigned' && job.status !== 'in_progress') {
        return { success: false, message: `Job cannot be marked as completed. Current status: ${job.status.replace('_', ' ')}.` };
    }

    await updateJobStatus(jobId, 'completed');
    return { success: true, message: "Job marked as completed!" };
  } catch (error: any) {
    console.error(`[markJobAsCompletedAction] Error. JobId: ${jobId}. Error:`, error.message, error.stack, error.code);
    return { success: false, message: `Failed to mark job as completed: ${error.message}.` };
  }
}


export async function checkUserAccountTypeAction(userId: string): Promise<{ accountType: AppUser['accountType'] | null, error?: string }> {
    if (!adminDb || typeof adminDb.collection !== 'function') {
      const errorMsg = "[checkUserAccountTypeAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
      console.error(errorMsg);
      return { accountType: null, error: "Server error: Core database service unavailable." };
    }
    if (!userId) return { accountType: null, error: "User ID not provided" };
    try {
        const userProfile = await getUserProfileFromFirestore(userId);
        return { accountType: userProfile?.accountType || null };
    } catch (error: any) {
        console.error(`[checkUserAccountTypeAction] Error. UserID: ${userId}. Error:`, error.message, error.stack, error.code);
        return { accountType: null, error: `Failed to get user account type: ${error.message}.` };
    }
}

export async function checkExistingReviewAction(jobId: string, clientId: string): Promise<{ hasReviewed: boolean, error?: string }> {
    if (!adminDb || typeof adminDb.collection !== 'function') {
      const errorMsg = "[checkExistingReviewAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
      console.error(errorMsg);
      return { hasReviewed: false, error: "Server error: Core database service unavailable." };
    }
    if (!jobId || !clientId) return { hasReviewed: false, error: "Job ID or Client ID not provided." };
    try {
        const existingReview = await getReviewForJobByClient(jobId, clientId);
        return { hasReviewed: !!existingReview };
    } catch (error: any) {
        console.error(`[checkExistingReviewAction] Error. JobID: ${jobId}, ClientID: ${clientId}. Error:`, error.message, error.stack, error.code);
        return { hasReviewed: false, error: `Failed to check for existing review: ${error.message}.` };
    }
}

export interface JobDetailsPageData {
  job: Job | null;
  quotes: Quote[];
  error?: string;
}

export async function fetchJobDetailsPageDataAction(jobId: string): Promise<JobDetailsPageData> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchJobDetailsPageDataAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return { job: null, quotes: [], error: "Server error: Core database service unavailable." };
  }
  console.log(`[fetchJobDetailsPageDataAction] Received jobId: ${jobId}, typeof: ${typeof jobId}`);
  
  if (!jobId) {
    console.error("[fetchJobDetailsPageDataAction] Job ID is missing.");
    return { job: null, quotes: [], error: "Job ID is missing." };
  }
  try {
    const job = await getJobByIdFromFirestore(jobId);
    const quotes = job ? await getQuotesForJob(jobId) : [];
    
    if (!job) {
      return { job: null, quotes: [], error: "Job not found." };
    }
    return { job, quotes };
  } catch (error: any) {
    console.error(`[fetchJobDetailsPageDataAction] Error fetching job details for Job ID: ${jobId}. Error:`, error.message, error.stack, error.code);
    return { job: null, quotes: [], error: `Failed to fetch job details: ${error.message}.` };
  }
}
