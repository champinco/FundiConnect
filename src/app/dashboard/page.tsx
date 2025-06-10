
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
import { format } from 'date-fns';

interface ClientDashboardData {
  jobSummary: ClientJobSummary;
}

interface ProviderDashboardData {
  providerProfile: ProviderProfile | null;
  quoteSummary: ProviderQuoteSummary;
  assignedJobs: Job[];
}

type DashboardData = ClientDashboardData | ProviderDashboardData | null;

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userProfile = await getUserProfileFromFirestore(user.uid);
          setAppUser(userProfile);

          if (userProfile?.accountType === 'client') {
            const jobSummary = await getJobSummaryForClient(user.uid);
            setDashboardData({ jobSummary });
          } else if (userProfile?.accountType === 'provider') {
            const [providerProfile, quoteSummary, assignedJobs] = await Promise.all([
              getProviderProfileFromFirestore(user.uid),
              getSubmittedQuotesSummaryForProvider(user.uid),
              getAssignedJobsForProvider(user.uid, 3)
            ]);
            setDashboardData({ providerProfile, quoteSummary, assignedJobs });
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          // Handle error appropriately, maybe set an error state
        }
      } else {
        setAppUser(null);
        setDashboardData(null);
      }
      setIsLoading(false);
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

  if (!currentUser || !appUser) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8 shadow-lg bg-card">
        <CardHeader className="flex flex-row items-center space-x-4 pb-4">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={appUser.photoURL || undefined} alt={appUser.fullName || appUser.email} data-ai-hint="user avatar"/>
            <AvatarFallback>{appUser.fullName ? appUser.fullName.substring(0, 1).toUpperCase() : appUser.email.substring(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-3xl font-headline">Welcome back, {appUser.fullName || appUser.email}!</CardTitle>
            <CardDescription className="text-md">Here's your FundiConnect overview.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {appUser.accountType === 'client' && dashboardData && 'jobSummary' in dashboardData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><ListChecks className="mr-2 h-6 w-6 text-primary" />Job Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Open Jobs: <span className="font-semibold">{dashboardData.jobSummary.open}</span></p>
              <p>Assigned/In Progress: <span className="font-semibold">{dashboardData.jobSummary.assigned + dashboardData.jobSummary.inProgress}</span></p>
              <p>Completed Jobs: <span className="font-semibold">{dashboardData.jobSummary.completed}</span></p>
              <p>Total Jobs Posted: <span className="font-semibold">{dashboardData.jobSummary.total}</span></p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                <Link href="/jobs/post"><PlusCircle className="mr-2" /> Post New Job</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/search?myJobs=true"><Briefcase className="mr-2" /> View My Jobs</Link>
              </Button>
            </CardFooter>
          </Card>
          {/* Add more client-specific cards here */}
        </div>
      )}

      {appUser.accountType === 'provider' && dashboardData && 'providerProfile' in dashboardData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Star className="mr-2 h-6 w-6 text-yellow-400 fill-yellow-400" />Your Rating</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.providerProfile ? (
                <>
                  <p className="text-3xl font-bold">{dashboardData.providerProfile.rating.toFixed(1)} <span className="text-lg font-normal text-muted-foreground">/ 5.0</span></p>
                  <p className="text-sm text-muted-foreground">Based on {dashboardData.providerProfile.reviewsCount} reviews</p>
                </>
              ) : (
                <p className="text-muted-foreground">Profile data not available.</p>
              )}
            </CardContent>
             <CardFooter>
               <Button asChild variant="outline" className="w-full">
                 <Link href={`/providers/${appUser.uid}`}><LayoutDashboard className="mr-2" />View My Public Profile</Link>
               </Button>
             </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-6 w-6 text-primary" />Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Pending Quotes Submitted: <span className="font-semibold">{dashboardData.quoteSummary.pending}</span></p>
              <p>Accepted Quotes (Jobs Won): <span className="font-semibold">{dashboardData.quoteSummary.accepted}</span></p>
              <p>Total Quotes Submitted: <span className="font-semibold">{dashboardData.quoteSummary.total}</span></p>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  <Link href="/search"><Search className="mr-2" /> Browse Open Jobs</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/profile/edit"><Edit className="mr-2" /> Edit Profile</Link>
                </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><Briefcase className="mr-2 h-6 w-6 text-primary" />Active Jobs</CardTitle>
              <CardDescription>Jobs currently assigned to you or in progress.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.assignedJobs.length > 0 ? (
                <ul className="space-y-3">
                  {dashboardData.assignedJobs.map(job => (
                    <li key={job.id} className="p-3 border rounded-md hover:bg-muted/50">
                      <Link href={`/jobs/${job.id}`} className="block">
                        <h4 className="font-semibold truncate">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">Status: <span className="capitalize">{job.status.replace('_', ' ')}</span></p>
                        <p className="text-xs text-muted-foreground">Updated: {format(new Date(job.updatedAt), 'MMM d, yyyy')}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-4">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active jobs assigned to you currently.</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
