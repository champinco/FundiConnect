
"use server";

import { submitQuoteForJob, type SubmitQuoteData, updateQuoteStatus, getQuoteById, getQuotesForJob } from '@/services/quoteService';
import { updateJobStatus, getJobByIdFromFirestore } from '@/services/jobService';
import type { Quote, QuoteStatus } from '@/models/quote';
import type { Job, JobStatus } from '@/models/job';
import { submitReview, type ReviewData, getReviewForJobByClient } from '@/services/reviewService';
import type { User as AppUser } from '@/models/user';
import { getUserProfileFromFirestore } from '@/services/userService';
import { adminDb } from '@/lib/firebaseAdmin';


interface SubmitQuoteResult {
  success: boolean;
  message: string;
  quoteId?: string;
}

export async function submitQuoteAction(
  data: Omit<SubmitQuoteData, 'providerId'> & { providerId: string }
): Promise<SubmitQuoteResult> {
  if (!adminDb) {
    console.error("[submitQuoteAction] Admin DB not initialized.");
    return { success: false, message: "Server error: Could not submit quote." };
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
    console.error("Submit Quote Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred." };
  }
}


interface UpdateQuoteStatusResult {
  success: boolean;
  message: string;
}

export async function acceptQuoteAction(jobId: string, quoteId: string, providerIdToAssign: string): Promise<UpdateQuoteStatusResult> {
  if (!adminDb) {
    console.error("[acceptQuoteAction] Admin DB not initialized.");
    return { success: false, message: "Server error: Could not accept quote." };
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
    console.error("Accept Quote Action Error:", error);
    return { success: false, message: error.message || "Failed to accept quote." };
  }
}

export async function rejectQuoteAction(quoteId: string): Promise<UpdateQuoteStatusResult> {
  if (!adminDb) {
    console.error("[rejectQuoteAction] Admin DB not initialized.");
    return { success: false, message: "Server error: Could not reject quote." };
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
    console.error("Reject Quote Action Error:", error);
    return { success: false, message: error.message || "Failed to reject quote." };
  }
}


interface SubmitReviewResult {
  success: boolean;
  message: string;
  reviewId?: string;
}
export async function submitReviewAction(data: ReviewData): Promise<SubmitReviewResult> {
  if (!adminDb) {
    console.error("[submitReviewAction] Admin DB not initialized.");
    return { success: false, message: "Server error: Could not submit review." };
  }
  try {
    const reviewId = await submitReview(data);
    return { success: true, message: "Review submitted successfully!", reviewId };
  } catch (error: any) {
    console.error("Submit Review Action Error:", error);
    return { success: false, message: error.message || "An unexpected error occurred while submitting your review." };
  }
}

interface MarkJobAsCompletedResult {
  success: boolean;
  message: string;
}

export async function markJobAsCompletedAction(jobId: string, expectedClientId: string): Promise<MarkJobAsCompletedResult> {
  if (!adminDb) {
    console.error("[markJobAsCompletedAction] Admin DB not initialized.");
    return { success: false, message: "Server error: Could not mark job as completed." };
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
    console.error("Mark Job As Completed Action Error:", error);
    return { success: false, message: error.message || "Failed to mark job as completed." };
  }
}


export async function checkUserAccountTypeAction(userId: string): Promise<{ accountType: AppUser['accountType'] | null, error?: string }> {
    if (!adminDb) {
      console.error("[checkUserAccountTypeAction] Admin DB not initialized.");
      return { accountType: null, error: "Server error: Admin DB not available." };
    }
    if (!userId) return { accountType: null, error: "User ID not provided" };
    try {
        const userProfile = await getUserProfileFromFirestore(userId);
        return { accountType: userProfile?.accountType || null };
    } catch (error: any) {
        console.error("Error in checkUserAccountTypeAction:", error);
        return { accountType: null, error: error.message || "Failed to get user account type." };
    }
}

export async function checkExistingReviewAction(jobId: string, clientId: string): Promise<{ hasReviewed: boolean, error?: string }> {
    if (!adminDb) {
      console.error("[checkExistingReviewAction] Admin DB not initialized.");
      return { hasReviewed: false, error: "Server error: Admin DB not available." };
    }
    if (!jobId || !clientId) return { hasReviewed: false, error: "Job ID or Client ID not provided." };
    try {
        const existingReview = await getReviewForJobByClient(jobId, clientId);
        return { hasReviewed: !!existingReview };
    } catch (error: any) {
        console.error("Error in checkExistingReviewAction:", error);
        return { hasReviewed: false, error: error.message || "Failed to check for existing review." };
    }
}

export interface JobDetailsPageData {
  job: Job | null;
  quotes: Quote[];
  error?: string;
}

export async function fetchJobDetailsPageDataAction(jobId: string): Promise<JobDetailsPageData> {
  console.log(`[fetchJobDetailsPageDataAction] Received jobId: ${jobId}, typeof: ${typeof jobId}`);
  if (!adminDb) {
    console.error("[fetchJobDetailsPageDataAction] CRITICAL: Admin DB not initialized. Aborting fetch.");
    return { job: null, quotes: [], error: "Server error: Database service is not available. Please try again later." };
  }
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
    console.error("[fetchJobDetailsPageDataAction] Error fetching job details page data. Job ID:", jobId, "Error Details:", error.message, error.stack);
    return { job: null, quotes: [], error: "An unexpected error occurred while fetching job details. Please try again." };
  }
}

