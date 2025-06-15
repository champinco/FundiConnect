
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
  if (!adminDb) {
    console.error("[fetchDashboardDataAction] CRITICAL: Admin DB not initialized. Aborting fetch.");
    return { appUser: null, dashboardData: null, error: "Server error: Database service is not available." };
  }
  if (!userId) {
    return { appUser: null, dashboardData: null, error: "User not authenticated." };
  }

  try {
    const userProfile = await getUserProfileFromFirestore(userId);
    if (!userProfile) {
      return { appUser: null, dashboardData: null, error: "User profile not found." };
    }

    if (userProfile.accountType === 'client') {
      const jobSummary = await getJobSummaryForClient(userId);
      return { appUser: userProfile, dashboardData: { jobSummary } };
    } else if (userProfile.accountType === 'provider') {
      const [providerProfileData, quoteSummary, assignedJobs] = await Promise.all([
        getProviderProfileFromFirestore(userId),
        getSubmittedQuotesSummaryForProvider(userId),
        getAssignedJobsForProvider(userId, 3)
      ]);
      return { appUser: userProfile, dashboardData: { providerProfile: providerProfileData, quoteSummary, assignedJobs } };
    }
    // This case should ideally not be reached if accountType is always client or provider
    console.warn(`[fetchDashboardDataAction] Unknown account type "${userProfile.accountType}" for user ID: ${userId}`);
    return { appUser: userProfile, dashboardData: null, error: "Unknown account type encountered." };
  } catch (error: any) {
    console.error("[fetchDashboardDataAction] Error fetching dashboard data. User ID:", userId, "Error:", error);
    return { appUser: null, dashboardData: null, error: error.message || "Failed to load dashboard data due to an unexpected server error." };
  }
}
