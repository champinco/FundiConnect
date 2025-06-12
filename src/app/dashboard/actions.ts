
"use server";

import { auth } from '@/lib/firebase'; // For getting current user server-side if needed by actions
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getJobSummaryForClient, getAssignedJobsForProvider, type ClientJobSummary } from '@/services/jobService';
import { getSubmittedQuotesSummaryForProvider, type ProviderQuoteSummary } from '@/services/quoteService';
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { Job } from '@/models/job';

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
    return { appUser: userProfile, dashboardData: null, error: "Unknown account type." };
  } catch (error: any) {
    console.error("Error fetching dashboard data action:", error);
    return { appUser: null, dashboardData: null, error: error.message || "Failed to load dashboard data." };
  }
}
