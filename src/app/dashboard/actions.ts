
"use server";

import { auth } from '@/lib/firebase'; // For getting current user server-side if needed by actions
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getJobSummaryForClient, getAssignedJobsForProvider, type ClientJobSummary } from '@/services/jobService';
import { getSubmittedQuotesSummaryForProvider, type ProviderQuoteSummary } from '@/services/quoteService';
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { Job } from '@/models/job';
import { adminDb } from '@/lib/firebaseAdmin';

interface ClientDashboardData {
  jobSummary: ClientJobSummary;
}

interface ProviderDashboardData {
  providerProfile: ProviderProfile | null;
  quoteSummary: ProviderQuoteSummary;
  assignedJobs: Job[];
}

export interface DashboardPageData {
  appUser: AppUser | null;
  dashboardData: ClientDashboardData | ProviderDashboardData | null;
  error?: string;
}

export async function fetchDashboardDataAction(userId: string): Promise<DashboardPageData> {
  console.log(`[fetchDashboardDataAction] Initiated for userId: ${userId}`);
  console.log(`[fetchDashboardDataAction] Verifying adminDb. typeof adminDb: ${typeof adminDb}, typeof adminDb?.collection: ${typeof adminDb?.collection}`);

  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchDashboardDataAction] CRITICAL: Admin DB not initialized or adminDb.collection is not a function. Aborting fetch.");
    return { appUser: null, dashboardData: null, error: "Server error: Database service is not available for dashboard." };
  }
  if (!userId) {
    console.warn("[fetchDashboardDataAction] userId is missing.");
    return { appUser: null, dashboardData: null, error: "User not authenticated." };
  }

  try {
    console.log(`[fetchDashboardDataAction] Attempting to get user profile for ${userId}`);
    const userProfile = await getUserProfileFromFirestore(userId);
    if (!userProfile) {
      console.warn(`[fetchDashboardDataAction] User profile not found for userId: ${userId}`);
      return { appUser: null, dashboardData: null, error: "User profile not found." };
    }
    console.log(`[fetchDashboardDataAction] User profile loaded. Account type: ${userProfile.accountType}`);

    if (userProfile.accountType === 'client') {
      console.log(`[fetchDashboardDataAction] Fetching job summary for client: ${userId}`);
      const jobSummary = await getJobSummaryForClient(userId);
      console.log(`[fetchDashboardDataAction] Job summary fetched:`, jobSummary);
      return { appUser: userProfile, dashboardData: { jobSummary } };
    } else if (userProfile.accountType === 'provider') {
      console.log(`[fetchDashboardDataAction] Fetching data for provider: ${userId}`);
      const [providerProfileData, quoteSummary, assignedJobs] = await Promise.all([
        getProviderProfileFromFirestore(userId),
        getSubmittedQuotesSummaryForProvider(userId),
        getAssignedJobsForProvider(userId, 3)
      ]);
      console.log(`[fetchDashboardDataAction] Provider data fetched. Profile: ${providerProfileData ? 'Loaded' : 'Not Found'}, Quotes:`, quoteSummary, "Assigned Jobs:", assignedJobs.length);
      return { appUser: userProfile, dashboardData: { providerProfile: providerProfileData, quoteSummary, assignedJobs } };
    }
    
    console.warn(`[fetchDashboardDataAction] Unknown account type "${userProfile.accountType}" for user ID: ${userId}`);
    return { appUser: userProfile, dashboardData: null, error: "Unknown account type encountered." };
  } catch (error: any) {
    console.error("[fetchDashboardDataAction] Top-level error fetching dashboard data. User ID:", userId);
    console.error("[fetchDashboardDataAction] Error Message:", error.message);
    console.error("[fetchDashboardDataAction] Error Stack:", error.stack);
    return { appUser: null, dashboardData: null, error: error.message || "Failed to load dashboard data due to an unexpected server error." };
  }
}
