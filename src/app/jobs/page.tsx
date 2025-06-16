
"use client";

import { useEffect, useState } from 'react';
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';
import { fetchAllJobsAction } from './actions'; // Updated path
import type { Job } from '@/models/job';
import { Briefcase, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function BrowseJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedJobs = await fetchAllJobsAction(50); // Fetch up to 50 jobs
        setJobs(fetchedJobs);
      } catch (err: any) {
        setError(err.message || "Failed to load jobs. Please try again later.");
        console.error("Error fetching all jobs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadJobs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline mb-1 text-primary">Browse Job Postings</h1>
                <p className="text-md md:text-lg text-muted-foreground">
                Explore all available job opportunities posted by clients.
                </p>
            </div>
            <Button asChild variant="outline">
                <Link href="/search?mode=jobs">
                    <Search className="mr-2 h-4 w-4" /> Advanced Job Search
                </Link>
            </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error Loading Jobs</AlertTitle>
          <AlertDescription>
            {error} Please try refreshing the page or check back later.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-center py-12 flex flex-col items-center bg-card p-8 rounded-lg shadow-md">
          <Briefcase className="h-20 w-20 text-primary opacity-60 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-foreground">No Jobs Available Right Now</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            It seems there are no open job postings at the moment. Check back soon, or if you&apos;re a client, consider posting a new job.
          </p>
          <Button asChild>
            <Link href="/jobs/post">Post a Job</Link>
          </Button>
        </div>
      )}

      {!isLoading && !error && jobs.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
