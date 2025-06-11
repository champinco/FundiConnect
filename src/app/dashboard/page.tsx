
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfileFromFirestore } from '@/services/userService';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getJobSummaryForClient, getAssignedJobsForProvider, type ClientJobSummary } from '@/services/jobService';
import { getSubmittedQuotesSummaryForProvider, type ProviderQuoteSummary } from '@/services/quoteService';
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { Job } from '@/models/job';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Briefcase, Edit, Search, PlusCircle, LayoutDashboard, ListChecks, FileText, Star, Users, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNowStrict, isDate } from 'date-fns';

interface ClientDashboardData {
  jobSummary: ClientJobSummary;
}

interface ProviderDashboardData {
  providerProfile: ProviderProfile | null;
  quoteSummary: ProviderQuoteSummary;
  assignedJobs: Job[];
}

type DashboardData = ClientDashboardData | ProviderDashboardData | null;

// Helper function to format dates dynamically
const formatDynamicDate = (dateInput: Date | string | number | undefined | null): string => {
  if (!dateInput) return 'N/A';
  const date = isDate(dateInput) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const now = new Date();
  const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
  now.setDate(now.getDate() + 1); // Reset now to current

  if (date > oneDayAgo) {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  }
  return format(date, 'MMM d, yyyy');
};


export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    setIsLoading(true); // Explicitly set loading true at the start of effect
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userProfile = await getUserProfileFromFirestore(user.uid);
          setAppUser(userProfile);

          if (userProfile) { // Only fetch dashboard data if userProfile exists
            if (userProfile.accountType === 'client') {
              const jobSummary = await getJobSummaryForClient(user.uid);
              setDashboardData({ jobSummary });
            } else if (userProfile.accountType === 'provider') {
              const [providerProfileData, quoteSummary, assignedJobs] = await Promise.all([
                getProviderProfileFromFirestore(user.uid),
                getSubmittedQuotesSummaryForProvider(user.uid),
                getAssignedJobsForProvider(user.uid, 3)
              ]);
              setDashboardData({ providerProfile: providerProfileData, quoteSummary, assignedJobs });
            }
          } else {
            // User is authenticated but no app profile found.
            // appUser state is already null, isLoading will be set to false in finally.
            console.warn("User authenticated but no app profile found for UID:", user.uid);
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          setAppUser(null); // Ensure appUser is null on error
          setDashboardData(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentUser(null);
        setAppUser(null);
        setDashboardData(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  // After loading:
  if (!currentUser) {
    // If, after all checks, there's NO Firebase user, then prompt login.
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
             <Users className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Access Your Dashboard</CardTitle>
            <CardDescription>Please log in to view your personalized dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login?redirect=/dashboard">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appUser) {
    // If there IS a Firebase user, but NO app user profile, this is an error/incomplete profile state.
    return (
       <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
             <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Profile Error</CardTitle>
            <CardDescription>We couldn't find your application profile details. This can happen if account setup didn't complete fully. Please try refreshing the page, or logging out and then logging back in. If the issue continues, please contact support.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} >
              Refresh Page
            </Button>
            <Button onClick={() => auth.signOut().then(() => window.location.href = '/auth/login')} variant="outline">
              Logout and Login Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If currentUser and appUser exist, render the dashboard:
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 md:p-8">
          <Avatar className="h-24 w-24 border-4 border-primary shadow-md">
            <AvatarImage src={appUser.photoURL || undefined} alt={appUser.fullName || appUser.email} data-ai-hint="user avatar"/>
            <AvatarFallback className="text-3xl">{appUser.fullName ? appUser.fullName.substring(0, 1).toUpperCase() : appUser.email.substring(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <CardTitle className="text-3xl lg:text-4xl font-headline">Welcome back, {appUser.fullName || appUser.email}!</CardTitle>
            <CardDescription className="text-md lg:text-lg mt-1">Here's your FundiConnect overview.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {appUser.accountType === 'client' && dashboardData && 'jobSummary' in dashboardData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><ListChecks className="mr-3 h-7 w-7 text-primary" />Job Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <p>Open Jobs: <span className="font-semibold text-lg text-primary">{dashboardData.jobSummary.open}</span></p>
              <p>Assigned/In Progress: <span className="font-semibold text-lg text-primary">{dashboardData.jobSummary.assigned + dashboardData.jobSummary.inProgress}</span></p>
              <p>Completed Jobs: <span className="font-semibold text-lg text-primary">{dashboardData.jobSummary.completed}</span></p>
              <p>Total Jobs Posted: <span className="font-semibold text-lg text-primary">{dashboardData.jobSummary.total}</span></p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button asChild className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/jobs/post"><PlusCircle className="mr-2" /> Post New Job</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:flex-1">
                <Link href="/search?myJobs=true"><Briefcase className="mr-2" /> View My Jobs</Link>
              </Button>
            </CardFooter>
          </Card>
          
           <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-1 lg:col-span-1 bg-primary/5 dark:bg-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><Search className="mr-3 h-7 w-7 text-primary" />Find a Fundi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-foreground/80 mb-4">Ready to start your next project? Search for qualified Fundis now.</p>
            </CardContent>
            <CardFooter className="pt-6">
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link href="/search">Browse Fundis</Link>
                </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {appUser.accountType === 'provider' && dashboardData && 'providerProfile' in dashboardData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><Star className="mr-3 h-7 w-7 text-yellow-400 fill-yellow-400" />Your Rating</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.providerProfile ? (
                <>
                  <p className="text-4xl font-bold text-primary">{dashboardData.providerProfile.rating.toFixed(1)} <span className="text-xl font-normal text-muted-foreground">/ 5.0</span></p>
                  <p className="text-sm text-muted-foreground mt-1">Based on {dashboardData.providerProfile.reviewsCount} reviews</p>
                </>
              ) : (
                <p className="text-muted-foreground">Profile data not available.</p>
              )}
            </CardContent>
             <CardFooter className="pt-6">
               <Button asChild variant="outline" className="w-full">
                 <Link href={`/providers/${appUser.uid}`}><LayoutDashboard className="mr-2" />View My Public Profile</Link>
               </Button>
             </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><FileText className="mr-3 h-7 w-7 text-primary" />Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <p>Pending Quotes: <span className="font-semibold text-lg text-primary">{dashboardData.quoteSummary.pending}</span></p>
              <p>Accepted Quotes: <span className="font-semibold text-lg text-primary">{dashboardData.quoteSummary.accepted}</span></p>
              <p>Total Submitted: <span className="font-semibold text-lg text-primary">{dashboardData.quoteSummary.total}</span></p>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button asChild className="w-full sm:flex-1 bg-primary hover:bg-primary/90">
                  <Link href="/search"><Search className="mr-2" /> Browse Open Jobs</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full sm:flex-1">
                  <Link href="/profile/edit"><Edit className="mr-2" /> Edit Profile</Link>
                </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><Briefcase className="mr-3 h-7 w-7 text-primary" />Active Jobs ({dashboardData.assignedJobs.length})</CardTitle>
              <CardDescription>Jobs currently assigned to you or in progress.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.assignedJobs.length > 0 ? (
                <ul className="space-y-4">
                  {dashboardData.assignedJobs.map(job => (
                    <li key={job.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                      <Link href={`/jobs/${job.id}`} className="block group">
                        <h4 className="font-semibold truncate group-hover:text-primary text-md">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">Status: <span className="capitalize font-medium">{job.status.replace('_', ' ')}</span></p>
                        <p className="text-xs text-muted-foreground">Updated: {formatDynamicDate(job.updatedAt)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No active jobs assigned to you currently.</p>
                 </div>
              )}
            </CardContent>
            {dashboardData.assignedJobs.length > 0 && (
                 <CardFooter className="pt-6">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/search?myJobs=true&status=assigned">View All My Active Jobs</Link>
                    </Button>
                 </CardFooter>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

