
"use client"; 

import { useEffect, useState, Suspense, use, useRef } from 'react'; // Changed useReact to use, imported directly
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCategoryIcon from '@/components/service-category-icon';
import { MapPin, CalendarDays, Briefcase, UserCircle, MessageSquare, ShieldCheck, ArrowLeft, Clock, FileText, DollarSign, Edit3, Loader2, Star, Trash2, Download, Lightbulb } from 'lucide-react'; // Added Star, Edit3, Trash2, Download, Lightbulb
import { format } from 'date-fns';
import { formatDynamicDate } from '@/lib/dateUtils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import SubmitQuoteForm from './components/submit-quote-form';
import AcceptRejectQuoteButtons from './components/accept-reject-quote-buttons';
import SubmitReviewForm from './components/submit-review-form';
import MarkAsCompletedButton from './components/mark-as-completed-button'; 
import { fetchJobDetailsPageDataAction, deleteJobAction, getQuoteAnalysisAction, type JobDetailsPageData } from './actions';
import type { Job, JobStatus } from '@/models/job';
import type { Quote } from '@/models/quote';
import type { QuoteAnalysisOutput } from '@/ai/flows/quote-analysis';
import { Avatar as ShadCNAvatar, AvatarFallback as ShadCNAvatarFallback, AvatarImage as ShadCNAvatarImage } from '@/components/ui/avatar'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { cn } from '@/lib/utils'; 
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateChatAction } from '@/app/messages/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateInvoicePdf } from '@/services/invoiceService';


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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const reviewFormRef = useRef<HTMLDivElement>(null); 
  const [promptForReview, setPromptForReview] = useState(false); 
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<QuoteAnalysisOutput | null>(null);

  const fetchData = async () => {
    if (jobId) {
      setIsLoading(true); 
      try {
        const data = await fetchJobDetailsPageDataAction(jobId);
        if (data.error || !data.job) {
          setError(data.error || "Job not found.");
          setJob(null);
          setQuotes([]);
        } else {
          setJob(data.job);
          setQuotes(data.quotes || []);
          setError(null);
        }
      } catch (err: any) {
        setError("Failed to load job details: " + err.message);
        setJob(null);
        setQuotes([]);
      } finally {
        setIsLoading(false); 
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, [jobId]); 

  useEffect(() => {
    if (promptForReview && job?.status === 'completed' && reviewFormRef.current) {
      reviewFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [promptForReview, job?.status]); 


  const handleQuoteActionComplete = () => {
    setAnalysisResult(null); // Clear previous analysis
    fetchData(); 
  };

  const handleJobSuccessfullyCompleted = async () => {
    await fetchData(); 
    setPromptForReview(true); 
  };

  const handleInitiateChatWithProvider = async (providerId: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to message providers.", variant: "destructive" });
      router.push(`/auth/login?redirect=/jobs/${jobId}`);
      return;
    }
    if (!job) return;

    setIsChatLoading(true);
    try {
      const result = await getOrCreateChatAction(currentUser.uid, providerId);
      if (result.error || !result.chatId) {
        throw new Error(result.error || "Could not initiate chat.");
      }
      router.push(`/messages/${result.chatId}`);
    } catch (error: any) {
      console.error("Error creating or getting chat:", error);
      toast({ title: "Error", description: error.message || "Could not start conversation.", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!currentUser || !job || job.clientId !== currentUser.uid) {
      toast({ title: 'Error', description: 'You are not authorized to delete this job.', variant: 'destructive' });
      return;
    }
    setIsDeleting(true);
    const result = await deleteJobAction(job.id, currentUser.uid);
    if (result.success) {
      toast({ title: 'Job Deleted', description: result.message });
      router.push('/jobs/my-jobs');
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
      setIsDeleting(false);
    }
  };
  
  const handleGetAnalysis = async () => {
    if (!job || !quotes || quotes.length === 0) return;
    setIsLoadingAnalysis(true);
    setAnalysisResult(null);
    try {
      const result = await getQuoteAnalysisAction(job, quotes);
      setAnalysisResult(result);
    } catch (error: any) {
      toast({ title: "Analysis Failed", description: error.message || "Could not get AI analysis.", variant: "destructive"});
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!job || job.status !== 'completed' || !job.assignedProviderId) return;

    const acceptedQuote = quotes.find(q => q.id === job.acceptedQuoteId);
    if (!acceptedQuote) {
      toast({ title: "Error", description: "Could not find the accepted quote details for the invoice.", variant: "destructive"});
      return;
    }
    generateInvoicePdf(job, acceptedQuote);
    toast({ title: "Invoice Generated", description: "Your invoice PDF is being downloaded."});
  };


  if (isLoading && !job) { 
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
              <Link href="/search?mode=jobs">Find Other Jobs</Link>
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

  const isJobOwner = currentUser?.uid === job.clientId;
  const acceptedQuote = quotes.find(q => q.id === job.acceptedQuoteId);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}> 
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
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
                <span>{job.serviceCategory === 'Other' && job.otherCategoryDescription ? job.otherCategoryDescription : job.serviceCategory}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
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
              {isJobOwner && (
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/jobs/edit/${job.id}`}><Edit3 className="mr-2 h-4 w-4"/>Edit</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the job post and all related quotes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteJob} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Delete Job
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
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
            
            {job.status === 'completed' && acceptedQuote && (
                <div className="mt-6 py-6 border-t">
                    <h3 className="text-lg font-semibold mb-3">Invoice</h3>
                    <Button
                        onClick={handleDownloadInvoice}
                        className="w-full"
                    >
                        <Download className="mr-2 h-4 w-4"/> Download Invoice
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Download a PDF invoice for this completed job.
                    </p>
                </div>
            )}

            {isJobOwner && (
              <MarkAsCompletedButton 
                  jobId={job.id} 
                  currentJobStatus={job.status} 
                  jobClientId={job.clientId}
                  onJobSuccessfullyCompleted={handleJobSuccessfullyCompleted}
              />
            )}

            { (job.status === 'open' || job.status === 'pending_quotes') && !isJobOwner && ( 
              <SubmitQuoteForm jobId={jobId} clientId={job.clientId} />
            )}
            
            <div ref={reviewFormRef}>
              {promptForReview && job.status === 'completed' && (
                  <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                    <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <AlertTitle className="font-semibold text-green-700 dark:text-green-300">Job Marked as Complete!</AlertTitle>
                    <AlertDescription className="text-green-600 dark:text-green-400">
                      Thank you for confirming the job is finished. Please take a moment to leave a review for {job.assignedProviderId ? `the provider` : 'the service'}. Your feedback is valuable!
                    </AlertDescription>
                  </Alert>
              )}
              {isJobOwner && job.assignedProviderId && ( 
                <SubmitReviewForm 
                    jobId={job.id} 
                    providerId={job.assignedProviderId} 
                    clientId={job.clientId} 
                    currentJobStatus={job.status} 
                />
              )}
            </div>

             {quotes.length > 0 && isJobOwner && (job.status !== 'completed' && job.status !== 'cancelled') && ( 
                <div className="mt-8">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h3 className="text-xl font-semibold">Received Quotes ({quotes.length})</h3>
                    {quotes.length > 1 && (
                      <Button onClick={handleGetAnalysis} disabled={isLoadingAnalysis} variant="outline" size="sm">
                        {isLoadingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Lightbulb className="mr-2 h-4 w-4"/>}
                        {isLoadingAnalysis ? "Analyzing..." : "Get AI Analysis"}
                      </Button>
                    )}
                  </div>
                  {analysisResult && (
                      <Card className="mb-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-blue-800 dark:text-blue-200 flex items-center"><Lightbulb className="mr-2"/>AI Quote Summary</CardTitle>
                          <CardDescription className="text-blue-700 dark:text-blue-300">{analysisResult.overallSummary}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {analysisResult.prosCons.map(item => (
                            <div key={item.quoteId}>
                              <h4 className="font-semibold">{item.providerName}</h4>
                              <ul className="text-sm list-disc pl-5">
                                {item.pros.map((pro, i) => <li key={i} className="text-green-700 dark:text-green-400">{pro}</li>)}
                                {item.cons.map((con, i) => <li key={i} className="text-amber-700 dark:text-amber-400">{con}</li>)}
                              </ul>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                  )}
                  <div className="space-y-4">
                    {quotes.map(quote => (
                      <Card key={quote.id} className={cn("bg-muted/20 dark:bg-muted/50", analysisResult?.bestValueRecommendation === quote.id && "border-primary ring-2 ring-primary")}>
                        {analysisResult?.bestValueRecommendation === quote.id && (
                          <div className="text-xs font-bold text-center py-1 bg-primary text-primary-foreground">
                            AI Recommended Best Value
                          </div>
                        )}
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
                           {(job.status === 'open' || job.status === 'pending_quotes') && ( 
                             <AcceptRejectQuoteButtons 
                                jobId={job.id} 
                                quote={quote} 
                                jobClientId={job.clientId} 
                                onQuoteActionComplete={handleQuoteActionComplete} 
                             /> 
                           )}
                            {isJobOwner && (
                                <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 ml-0 md:ml-2" 
                                onClick={() => handleInitiateChatWithProvider(quote.providerId)}
                                disabled={isChatLoading}
                                >
                                {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                Message {quote.providerDetails?.businessName || 'Provider'}
                                </Button>
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


export default function JobDetailPageWrapper({ params: paramsPromise }: { params: Promise<{ jobId: string }> }) { // Expect paramsPromise
    const resolvedParams = use(paramsPromise); // Use React.use to unwrap the promise

    return (
        <Suspense fallback={<JobDetailLoader />}>
            <JobDetails jobId={resolvedParams.jobId} />
        </Suspense>
    );
}
