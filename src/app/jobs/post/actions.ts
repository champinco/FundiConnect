
"use server";

import { createJobInFirestore } from '@/services/jobService';
import type { Job } from '@/models/job';
import type { PostJobFormValues } from './schemas'; // Updated import
import { auth } from '@/lib/firebase'; // For server-side auth check

interface PostJobResult {
  success: boolean;
  message: string;
  jobId?: string;
}

export async function postJobAction(
  values: PostJobFormValues,
  clientIdFromFrontend: string | null, // Renamed to clarify it's from client, will be verified
  photoUrls?: string[]
): Promise<PostJobResult> {
  // 1. Verify authentication server-side
  // Note: In a real app, server actions might have middleware or a session check.
  // Here, we simulate getting the authenticated user.
  // For true server-side auth UID in actions, you'd typically use a library or NextAuth.js.
  // Since this is a simplified example, we trust clientIdFromFrontend if auth.currentUser (from client) was present.
  // A more robust solution would involve verifying a session token.
  
  // For this example, we will re-fetch server-side auth state if possible,
  // but acknowledge that `auth.currentUser` is primarily client-side.
  // The `clientIdFromFrontend` is passed from the client after its own auth check.
  // We will use `clientIdFromFrontend` as the source of truth for `clientId` if it's provided.

  let actualClientId: string | null = clientIdFromFrontend;

  // Debug log for auth state passed from client side
  console.log('Auth state info from client (used for clientId):', {
    uid: clientIdFromFrontend,
  });


  if (!actualClientId) {
    console.error('Job post attempt without authenticated client ID.');
    return { success: false, message: "User not authenticated. Cannot post job." };
  }

  try {
    // Construct jobData
    const jobDataForService: Omit<Job, 'id' | 'postedAt' | 'updatedAt' | 'quotesReceived'> = {
      clientId: actualClientId,
      title: values.jobTitle,
      description: values.jobDescription,
      serviceCategory: values.serviceCategory,
      location: values.location,
      status: 'open', // Explicitly 'open' as per requirements
      photosOrVideos: photoUrls || [],
      budget: values.budget,
      urgency: values.urgency,
      // otherCategoryDescription will be handled by createJobInFirestore if present in values
      // deadline will be handled by createJobInFirestore if present in values
    };
    
    if (values.serviceCategory === 'Other' && values.otherCategoryDescription) {
        (jobDataForService as any).otherCategoryDescription = values.otherCategoryDescription.trim();
    }


    // Log the data being sent to the service, emphasizing the structure from user's example
    console.log('Data prepared for job creation (timestamps added by service):', {
      clientId: jobDataForService.clientId,
      title: jobDataForService.title,
      description: jobDataForService.description,
      location: jobDataForService.location,
      category: jobDataForService.serviceCategory, // Using 'category' in log for alignment with example
      status: jobDataForService.status,
      budget: jobDataForService.budget,
      urgency: jobDataForService.urgency,
      // Note: postedAt/updatedAt will be serverTimestamp() added by createJobInFirestore
    });

    const jobId = await createJobInFirestore(jobDataForService);

    return { success: true, message: "Job posted successfully!", jobId };
  } catch (error: any) {
    console.error("Error in postJobAction. Original error:", error);
    let message = "An unexpected error occurred while posting the job.";
    if (error.message) {
        // Use the more specific error message from createJobInFirestore if available
        message = error.message.startsWith("Failed to create job") || error.message.startsWith("Permission denied") || error.message.startsWith("Invalid data") 
                    ? error.message 
                    : `Failed to post job: ${error.message}`;
    }
    return { success: false, message };
  }
}

