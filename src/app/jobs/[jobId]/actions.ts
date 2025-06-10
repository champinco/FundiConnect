
"use server";

import { submitQuoteForJob, type SubmitQuoteData, updateQuoteStatus, getQuoteById } from '@/services/quoteService';
import { updateJobStatus, getJobByIdFromFirestore } from '@/services/jobService';
import type { QuoteStatus } from '@/models/quote';
import type { JobStatus } from '@/models/job';
import { submitReview, type ReviewData } from '@/services/reviewService';
import { auth } from '@/lib/firebase'; // We might not be able to use this directly for user auth in server actions without specific setup


interface SubmitQuoteResult {
  success: boolean;
  message: string;
  quoteId?: string;
}

export async function submitQuoteAction(
  data: Omit<SubmitQuoteData, 'providerId'> & { providerId: string }
): Promise<SubmitQuoteResult> {
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
  try {
    // Transaction: Update quote, update job, (optional: archive other quotes)
    // For MVP, we'll do them sequentially. A transaction would be better for production.
    
    // 1. Get the quote to ensure it's still pending
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
    // TODO: Consider archiving other quotes for this job.
    // e.g., await archiveOtherQuotesForJob(jobId, quoteId);

    return { success: true, message: "Quote accepted and job assigned!" };
  } catch (error: any) {
    console.error("Accept Quote Action Error:", error);
    return { success: false, message: error.message || "Failed to accept quote." };
  }
}

export async function rejectQuoteAction(quoteId: string): Promise<UpdateQuoteStatusResult> {
  try {
     // 1. Get the quote to ensure it's still pending
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
  // In a more secure setup, we'd get current user's ID server-side.
  // For now, client ensures only job owner calls this.
  // Server-side, we can re-fetch job to double check client ID if needed before update.
  try {
    const job = await getJobByIdFromFirestore(jobId);
    if (!job) {
      return { success: false, message: "Job not found." };
    }
    if (job.clientId !== expectedClientId) {
        // This check relies on the client sending the correct expectedClientId.
        // A server-side auth check against the caller's identity would be more robust.
        return { success: false, message: "You are not authorized to mark this job as completed." };
    }
    if (job.status !== 'assigned' && job.status !== 'in_progress') {
        return { success: false, message: `Job cannot be marked as completed. Current status: ${job.status}.` };
    }

    await updateJobStatus(jobId, 'completed');
    return { success: true, message: "Job marked as completed!" };
  } catch (error: any) {
    console.error("Mark Job As Completed Action Error:", error);
    return { success: false, message: error.message || "Failed to mark job as completed." };
  }
}
