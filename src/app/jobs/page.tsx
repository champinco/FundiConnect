
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User as AppUser } from '@/models/user';
// Removed direct call to getUserProfileFromFirestore - if appUser details are needed, a server action is better.
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';
import { fetchAllJobsAction } from './actions'; // Server action
import type { Job } from '@/models/job';
import { Briefcase, PlusCircle, AlertCircle, Search } from 'lucide-react'; // Added Search
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appUser, setAppUser] = useState<AppUser | null>(null); // For UI context
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseUserForUI, setFirebaseUserForUI] = useState<FirebaseUser | null>(null); // From Firebase Auth client

  // Effect for fetching all jobs (public data)
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates if component is unmounted
    const loadJobs = async () => {
      console.log("[JobsPage] Initiating job fetch.");
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await fetchAllJobsAction(50); // Fetch up to 50 jobs
        if (isMounted) {
          console.log(`[JobsPage] Successfully fetched ${fetchedJobs.length} jobs.`);
          setJobs(fetchedJobs);
        }
      } catch (err: any) {
        console.error("[JobsPage] Error fetching all jobs:", err);
        if (isMounted) {
          setError(err.message || "Failed to load jobs. Please try again later.");
          setJobs([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          console.log("[JobsPage] Job fetch finished, isLoading set to false.");
        }
      }
    };
    loadJobs();

    return () => {
      isMounted = false; // Cleanup function to set isMounted to false
      console.log("[JobsPage] Unmounted or job fetch effect re-running cleanup.");
    };
  }, []); // Empty dependency array: runs only once on mount

  // Effect for auth state (for UI personalization)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUserForUI(user);
      // If you need richer AppUser profile details for UI, fetch them via a server action here.
      // For now, we use firebaseUserForUI properties or a simplified AppUser structure.
      if (user) {
        // This is a simplified mapping. For accurate accountType, a server action is needed.
        setAppUser({
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'User',
            // IMPORTANT: accountType needs to be fetched from your backend for accuracy.
            // This is a placeholder and might lead to incorrect UI for "Post a Job" button.
            accountType: 'client', // <<-- PLACEHOLDER - FETCH ACTUAL ACCOUNT TYPE
            photoURL: user.photoURL,
            createdAt: new Date(), // Placeholder
            updatedAt: new Date(), // Placeholder
        });
      } else {
        setAppUser(null);
      }
    });
    return () => unsubscribe();
  }, []);


  const renderContent = () => {
    if (isLoading) {
      console.log("[JobsPage] Rendering loading skeletons.");
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
      console.log(`[JobsPage] Rendering error: ${error}`);
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
      console.log("[JobsPage] Rendering 'No Jobs Available'.");
      return (
        <div className="text-center py-12 flex flex-col items-center bg-card p-8 rounded-lg shadow-md">
          <Briefcase className="h-20 w-20 text-primary opacity-60 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-foreground">No Jobs Available Right Now</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            It seems there are no open job postings at the moment. Check back soon!
          </p>
          {/* Show "Post Job" button if user is logged in and is a client (requires accurate appUser.accountType) */}
          {firebaseUserForUI && appUser?.accountType === 'client' && (
            <Button asChild size="lg">
              <Link href="/jobs/post"><PlusCircle className="mr-2 h-5 w-5"/>Post a Job</Link>
            </Button>
          )}
        </div>
      );
    }
    console.log(`[JobsPage] Rendering ${jobs.length} job cards.`);
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
             {/* Button to go to advanced search page, always visible */}
            <Button asChild variant="outline">
                <Link href="/search?mode=jobs">
                    <Search className="mr-2 h-4 w-4" /> Advanced Job Search & Filters
                </Link>
            </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
