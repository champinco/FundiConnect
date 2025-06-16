
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User as AppUser } from '@/models/user';
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';
import { fetchAllJobsAction } from './actions'; 
import type { Job } from '@/models/job';
import { Briefcase, PlusCircle, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchCurrentAppUserTypeAction } from '@/app/profile/actions'; // To get accountType

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [accountType, setAccountType] = useState<AppUser['accountType'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseUserForUI, setFirebaseUserForUI] = useState<FirebaseUser | null>(null); 

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await fetchAllJobsAction(50); // Fetch up to 50 jobs
        if (isMounted) {
          setJobs(fetchedJobs);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load jobs. Please try again later.");
          setJobs([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialData();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUserForUI(user);
      if (user) {
        const type = await fetchCurrentAppUserTypeAction(user.uid);
        if (isMounted) setAccountType(type);
      } else {
        if (isMounted) setAccountType(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Jobs</AlertTitle>
          <AlertDescription>
            {error} Please try refreshing the page or check back later.
          </AlertDescription>
        </Alert>
      );
    }

    if (jobs.length === 0) {
      return (
        <div className="text-center py-12 flex flex-col items-center bg-card p-8 rounded-lg shadow-md">
          <Briefcase className="h-20 w-20 text-primary opacity-60 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-foreground">No Jobs Available Right Now</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            It seems there are no open job postings at the moment. Check back soon!
          </p>
          {firebaseUserForUI && accountType === 'client' && (
            <Button asChild size="lg">
              <Link href="/jobs/post"><PlusCircle className="mr-2 h-5 w-5"/>Post a Job</Link>
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline mb-1 text-primary">Browse Available Jobs</h1>
                <p className="text-md md:text-lg text-muted-foreground">
                Explore all open job opportunities posted by clients.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              {firebaseUserForUI && accountType === 'client' && (
                <Button asChild>
                  <Link href="/jobs/post">
                    <PlusCircle className="mr-2 h-4 w-4" /> Post New Job
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                  <Link href="/search?mode=jobs">
                      <Search className="mr-2 h-4 w-4" /> Advanced Job Search & Filters
                  </Link>
              </Button>
            </div>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
