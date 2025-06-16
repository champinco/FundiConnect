
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
JobCardSkeleton
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';
import { fetchMyClientJobsAction } from '../actions';
import type { Job } from '@/models/job';
import { Briefcase, PlusCircle, UserCircle, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MyJobsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        router.push('/auth/login?redirect=/jobs/my-jobs');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser && currentUser.uid) {
      const loadMyJobs = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log(`[MyJobsPage] Fetching jobs for client: ${currentUser.uid}`);
          const fetchedJobs = await fetchMyClientJobsAction(currentUser.uid);
          console.log(`[MyJobsPage] Successfully fetched ${fetchedJobs.length} jobs for client.`);
          setMyJobs(fetchedJobs);
        } catch (err: any) {
          setError(err.message || "Failed to load your jobs. Please try again.");
          console.error("[MyJobsPage] Error fetching client jobs:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadMyJobs();
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
    }
  }, [currentUser, authLoading]);

  if (authLoading || (isLoading && currentUser)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline mb-2">My Posted Jobs</h1>
            <p className="text-muted-foreground">Loading your job postings...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <UserCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Login Required</h2>
        <p className="text-muted-foreground mb-6">Please log in to view your posted jobs.</p>
        <Button asChild>
          <Link href="/auth/login?redirect=/jobs/my-jobs">Login</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline mb-1 text-primary">My Posted Jobs</h1>
                <p className="text-md md:text-lg text-muted-foreground">
                Manage and review the status of all jobs you have posted.
                </p>
            </div>
            <div className="flex gap-2">
                <Button asChild variant="outline">
                    <Link href="/search?mode=jobs&myJobs=true&status=all_my">
                        <Search className="mr-2 h-4 w-4" /> Filter My Jobs
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/jobs/post">
                        <PlusCircle className="mr-2 h-4 w-4" /> Post New Job
                    </Link>
                </Button>
            </div>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(myJobs.length > 0 ? myJobs.length : 3)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Your Jobs</AlertTitle>
          <AlertDescription>
            {error} Please try refreshing the page or check back later.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && myJobs.length === 0 && (
        <div className="text-center py-12 flex flex-col items-center bg-card p-8 rounded-lg shadow-md">
          <Briefcase className="h-20 w-20 text-primary opacity-60 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-foreground">You Haven&apos;t Posted Any Jobs Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get started by posting a new job and find qualified Fundis for your needs.
          </p>
          <Button asChild size="lg">
            <Link href="/jobs/post"><PlusCircle className="mr-2 h-5 w-5"/>Post Your First Job</Link>
          </Button>
        </div>
      )}

      {!isLoading && !error && myJobs.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
