
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getJobSummaryForClient, getAssignedJobsForProvider, getRecentJobsForClient, type ClientJobSummary } from '@/services/jobService';
import { getSubmittedQuotesSummaryForProvider, type ProviderQuoteSummary } from '@/services/quoteService';
import { getBookingRequestsForClient, getBookingRequestsForProvider, getConfirmedBookingsForProvider } from '@/services/bookingService'; // Added
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { Job } from '@/models/job';
import type { BookingRequest } from '@/models/booking'; // Added


interface ClientDashboardData {
  jobSummary: ClientJobSummary;
  clientBookings: BookingRequest[];
  recentJobs: Job[]; // Added for tracking recent activity
}

interface ProviderDashboardData {
  providerProfile: ProviderProfile | null;
  quoteSummary: ProviderQuoteSummary;
  assignedJobs: Job[];
  providerBookings: BookingRequest[];
  confirmedBookings: BookingRequest[]; // For the schedule
}

export interface DashboardPageData {
  appUser: AppUser | null;
  dashboardData: ClientDashboardData | ProviderDashboardData | null;
  error?: string;
}

export async function fetchDashboardDataAction(userId: string): Promise<DashboardPageData> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchDashboardDataAction] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    return { appUser: null, dashboardData: null, error: "Server error: Core database service is not available. Please try again later." };
  }
  
  console.log(`[fetchDashboardDataAction] Initiated for userId: ${userId}`);

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
      console.log(`[fetchDashboardDataAction] Fetching data for client: ${userId}`);
      const [jobSummary, clientBookings, recentJobs] = await Promise.all([
        getJobSummaryForClient(userId),
        getBookingRequestsForClient(userId),
        getRecentJobsForClient(userId, 3) // Fetch 3 most recent jobs
      ]);
      console.log(`[fetchDashboardDataAction] Client data fetched. JobSummary:`, jobSummary, `Bookings: ${clientBookings.length}`, `Recent Jobs: ${recentJobs.length}`);
      return { appUser: userProfile, dashboardData: { jobSummary, clientBookings, recentJobs } };
    } else if (userProfile.accountType === 'provider') {
      console.log(`[fetchDashboardDataAction] Fetching data for provider: ${userId}`);
      const [providerProfileData, quoteSummary, assignedJobs, providerBookings, confirmedBookings] = await Promise.all([
        getProviderProfileFromFirestore(userId),
        getSubmittedQuotesSummaryForProvider(userId),
        getAssignedJobsForProvider(userId, 3),
        getBookingRequestsForProvider(userId),
        getConfirmedBookingsForProvider(userId, 7) // Fetch confirmed bookings for the next 7 days
      ]);
      console.log(`[fetchDashboardDataAction] Provider data fetched. Profile: ${providerProfileData ? 'Loaded' : 'Not Found'}, Quotes:`, quoteSummary, "Assigned Jobs:", assignedJobs.length, "Bookings:", providerBookings.length);
      return { appUser: userProfile, dashboardData: { providerProfile: providerProfileData, quoteSummary, assignedJobs, providerBookings, confirmedBookings } };
    }
    
    console.warn(`[fetchDashboardDataAction] Unknown account type "${userProfile.accountType}" for user ID: ${userId}`);
    return { appUser: userProfile, dashboardData: null, error: "Unknown account type encountered." };
  } catch (error: any) {
    console.error(`[fetchDashboardDataAction] Error fetching dashboard data for User ID: ${userId}. Error:`, error.message, error.stack, error.code);
    return { appUser: null, dashboardData: null, error: `Failed to load dashboard data: ${error.message}.` };
  }
}
