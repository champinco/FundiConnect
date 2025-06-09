
"use server";

import { submitQuoteForJob, type SubmitQuoteData } from '@/services/quoteService';
import { updateJobStatus } from '@/services/jobService'; // We'll need this later
import type { QuoteStatus } from '@/models/quote'; // We'll need this later
import type { JobStatus } from '@/models/job';


interface SubmitQuoteResult {
  success: boolean;
  message: string;
  quoteId?: string;
}

export async function submitQuoteAction(
  data: Omit<SubmitQuoteData, 'providerId'> & { providerId: string } // providerId is passed by form logic
): Promise<SubmitQuoteResult> {
  try {
    // Ensure providerId is explicitly part of the data for the service
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
    // This would involve a transaction in a real app:
    // 1. Update the quote status to 'accepted'.
    // 2. Update all other quotes for this job to 'archived' or 'rejected'.
    // 3. Update the job status to 'assigned' and set 'assignedProviderId'.

    // For now, simplified:
    await Promise.all([
      // In quoteService.ts, a function like updateQuoteStatus(quoteId, 'accepted') would be called
      // And a function like archiveOtherQuotes(jobId, acceptedQuoteId)

      // In jobService.ts
      updateJobStatus(jobId, 'assigned', providerIdToAssign)
    ]);

    // Placeholder for actual service calls:
    // await quoteService.updateQuoteStatus(quoteId, 'accepted');
    // await quoteService.archiveOtherQuotesForJob(jobId, quoteId);
    // await jobService.assignJobToProvider(jobId, providerIdToAssign);

    return { success: true, message: "Quote accepted and job assigned!" };
  } catch (error: any) {
    console.error("Accept Quote Action Error:", error);
    return { success: false, message: error.message || "Failed to accept quote." };
  }
}

export async function rejectQuoteAction(quoteId: string): Promise<UpdateQuoteStatusResult> {
  try {
    // await quoteService.updateQuoteStatus(quoteId, 'rejected');
    return { success: true, message: "Quote rejected." };
  } catch (error: any) {
    console.error("Reject Quote Action Error:", error);
    return { success: false, message: error.message || "Failed to reject quote." };
  }
}
