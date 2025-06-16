
"use client"; // This page needs to be a client component to use hooks like useState, useEffect, and onAuthStateChanged

import { useEffect, useState, Suspense } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCategoryIcon from '@/components/service-category-icon';
import { MapPin, CalendarDays, Briefcase, UserCircle, MessageSquare, ShieldCheck, ArrowLeft, Clock, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { formatDynamicDate } from '@/lib/dateUtils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import SubmitQuoteForm from './components/submit-quote-form';
import AcceptRejectQuoteButtons from './components/accept-reject-quote-buttons';
import SubmitReviewForm from './components/submit-review-form';
import MarkAsCompletedButton from './components/mark-as-completed-button'; 
import { fetchJobDetailsPageDataAction, type JobDetailsPageData } from './actions';
import type { Job, JobStatus } from '@/models/job';
import type { Quote } from '@/models/quote';
import { Avatar as ShadCNAvatar, AvatarFallback as ShadCNAvatarFallback, AvatarImage as ShadCNAvatarImage } from '@/components/ui/avatar'; // Explicit import for clarity


// Loader for Suspense boundary if JobDetails itself is not async
function JobDetailLoader() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
                <div className="mb-6 h-10 w-32 bg-muted rounded"></div> {/* Back button skeleton */}
                <Card className="shadow-xl">
                    <CardHeader className="border-b">
                        <div className="h-8 w-3/4 bg-muted rounded mb-2"></div> {/* Title skeleton */}
                        <div className="h-6 w-1/2 bg-muted rounded"></div> {/* Category skeleton */}
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div className="h-20 bg-muted rounded"></div> {/* Description skeleton */}
                            <div className="h-32 bg-muted rounded"></div> {/* Photos skeleton */}
                        </div>
                        <aside className="space-y-4 md:border-l md:pl-6">
                            <Card>
                                <CardHeader><div className="h-6 w-1/2 bg-muted rounded"></div></CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="h-5 w-3/4 bg-muted rounded"></div>
                                    <div className="h-5 w-2/3 bg-muted rounded"></div>
                                    <div className="h-5 w-3/4 bg-muted rounded"></div>
                                </CardContent>
                            </Card>
                        </aside>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


interface JobDetailsProps {
  jobId: string;
}

function JobDetails({ jobId }: JobDetailsProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (jobId) {
      setIsLoading(true);
      fetchJobDetailsPageDataAction(jobId)
        .then(data => {
          if (data.error || !data.job) {
            setError(data.error || "Job not found.");
            setJob(null);
            setQuotes([]);
          } else {
            setJob(data.job);
            setQuotes(data.quotes || []);
            setError(null);
          }
        })
        .catch(err => {
          setError("Failed to load job details: " + err.message);
          setJob(null);
          setQuotes([]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [jobId]);

  if (isLoading) {
    return <JobDetailLoader />;
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
             <FileText className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>{error ? "Error Loading Job" : "Job Not Found"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "The job you are looking for does not exist or could not be loaded."}</p>
            <Button asChild className="mt-6">
              <Link href="/search">Find Other Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const jobStatusDisplay: Record<JobStatus, string> = {
    open: 'Open',
    pending_quotes: 'Awaiting Quotes',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/search?mode=jobs"> {/* Default to job search */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Briefcase className="h-7 w-7 text-primary" />
                <CardTitle className="text-3xl font-headline">{job.title}</CardTitle>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                <ServiceCategoryIcon category={job.serviceCategory} iconOnly className="h-4 w-4" />
                <span>{job.serviceCategory}{job.otherCategoryDescription ? ` (${job.otherCategoryDescription})` : ''}</span>
              </div>
            </div>
            <Badge 
              variant={job.status === 'open' ? 'secondary' : job.status === 'completed' ? 'default' : 'outline'}
              className={`capitalize text-sm px-3 py-1 ${
                job.status === 'open' || job.status === 'pending_quotes' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700' : 
                job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' :
                job.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700' :
                job.status === 'assigned' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-800/30 dark:text-purple-300 dark:border-purple-700' :
                'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' 
              }`}
            >
              {jobStatusDisplay[job.status] || job.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Job Description</h3>
              <p className="text-foreground/90 whitespace-pre-line">{job.description}</p>
            </div>

            {job.photosOrVideos && job.photosOrVideos.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Attached Files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {job.photosOrVideos.map((url, index) => (
                    <Link href={url} key={index} target="_blank" rel="noopener noreferrer" className="aspect-square relative group rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                      <Image src={url} alt={`Job attachment ${index + 1}`} fill style={{ objectFit: 'cover' }} data-ai-hint="job image" />
                       <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs p-1 bg-black/70 rounded">View Image</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {currentUserId === job.clientId && (
              <MarkAsCompletedButton 
                  jobId={job.id} 
                  currentJobStatus={job.status} 
                  jobClientId={job.clientId} 
              />
            )}

            { (job.status === 'open' || job.status === 'pending_quotes') && currentUserId !== job.clientId && ( // Only show if job is open and current user is NOT client
              <SubmitQuoteForm jobId={jobId} clientId={job.clientId} />
            )}
            
            {currentUserId === job.clientId && job.assignedProviderId && ( // Only client can review their assigned provider
              <SubmitReviewForm 
                  jobId={job.id} 
                  providerId={job.assignedProviderId} 
                  clientId={job.clientId} 
                  currentJobStatus={job.status} 
              />
            )}

             {quotes.length > 0 && (job.status !== 'completed' && job.status !== 'cancelled') && ( // Show quotes unless job is completed or cancelled
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Received Quotes ({quotes.length})</h3>
                  <div className="space-y-4">
                    {quotes.map(quote => (
                      <Card key={quote.id} className="bg-muted/20 dark:bg-muted/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <ShadCNAvatar className="h-10 w-10">
                                    <ShadCNAvatarImage src={quote.providerDetails?.profilePictureUrl || undefined} alt={quote.providerDetails?.businessName || 'Provider'} data-ai-hint="provider avatar" />
                                    <ShadCNAvatarFallback>
                                    {quote.providerDetails?.businessName ? quote.providerDetails.businessName.substring(0,1).toUpperCase() : "P"}
                                    </ShadCNAvatarFallback>
                                </ShadCNAvatar>
                                <div>
                                    <Link href={`/providers/${quote.providerId}`} className="font-semibold hover:underline">
                                    {quote.providerDetails?.businessName || 'Provider Profile'}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                    Sent: {formatDynamicDate(quote.createdAt, true)}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={quote.status === 'accepted' ? 'default' : 'outline'} 
                                className={`capitalize ${
                                    quote.status === 'accepted' ? 'bg-green-500 text-white border-green-600 dark:bg-green-600 dark:text-green-50 dark:border-green-700' : 
                                    quote.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-800/30 dark:text-red-300 dark:border-red-700' : 
                                    ''}`}>
                                {quote.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-primary mb-2">{quote.currency} {quote.amount.toLocaleString()}</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line mb-3">{quote.messageToClient}</p>
                           {(job.status === 'open' || job.status === 'pending_quotes') && currentUserId === job.clientId && ( // Only job client can accept/reject
                             <AcceptRejectQuoteButtons jobId={job.id} quote={quote} currentUserId={currentUserId} /> 
                           )}
                           {quote.status === 'accepted' && (
                             <p className="text-sm text-green-600 font-medium mt-2">This quote has been accepted for the job.</p>
                           )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {(job.status === 'open' || job.status === 'pending_quotes') && quotes.length === 0 && (
                  <div className="text-center py-10 my-6 bg-card rounded-lg shadow-sm">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-primary opacity-70" />
                      <h4 className="text-lg font-semibold text-foreground mb-1">No Quotes Yet</h4>
                      <p className="text-sm text-muted-foreground">Providers will be notified about your job. Check back soon for quotes!</p>
                  </div>
              )}

          </div>
          <aside className="space-y-4 md:border-l md:pl-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">{job.location}</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">Posted: {formatDynamicDate(job.postedAt)}</span>
                </div>
                {job.budget && (
                    <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-primary" />
                        <span className="text-muted-foreground">Budget: {job.budget.toLocaleString()} {job.budgetRange?.currency || 'KES'}</span>
                    </div>
                )}
                {job.deadline && (
                   <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-muted-foreground">Deadline: {format(new Date(job.deadline), 'PPP')}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">Client ID: {job.clientId.substring(0, 10)}...</span> 
                </div>
                <div className="flex items-center">
                   <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">Quotes Received: {quotes.length || 0}</span>
                </div>
                {job.assignedProviderId && (
                  <div className="flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-muted-foreground">Assigned To: <Link href={`/providers/${job.assignedProviderId}`} className="text-primary hover:underline">{job.assignedProviderId.substring(0,10)}...</Link></span>
                  </div>
                )}
              </CardContent>
            </Card>
            
          </aside>
        </CardContent>
      </Card>
    </div>
  );
}


export default function JobDetailPageWrapper({ params }: { params: { jobId: string } }) {
    return (
        <Suspense fallback={<JobDetailLoader />}>
            <JobDetails jobId={params.jobId} />
        </Suspense>
    );
}
