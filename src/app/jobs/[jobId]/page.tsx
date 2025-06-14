
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCategoryIcon from '@/components/service-category-icon';
import { MapPin, CalendarDays, Briefcase, UserCircle, MessageSquare, CheckCircle, XCircle, Loader2, ShieldCheck, ArrowLeft, Clock, FileText } from 'lucide-react';
import { format, formatDistanceToNowStrict, isDate } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import SubmitQuoteForm from './components/submit-quote-form';
import AcceptRejectQuoteButtons from './components/accept-reject-quote-buttons';
import SubmitReviewForm from './components/submit-review-form';
import MarkAsCompletedButton from './components/mark-as-completed-button'; 
import { fetchJobDetailsPageDataAction } from './actions';

// Helper function to format dates dynamically
const formatDynamicDate = (dateInput: Date | string | number | undefined | null, includeTime: boolean = false): string => {
  if (!dateInput) return 'N/A';
  const date = isDate(dateInput) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const now = new Date();
  const oneDayAgo = new Date(now.setDate(now.getDate() - 1));
   now.setDate(now.getDate() + 1); // Reset now to current day to correctly compare against oneDayAgo

  if (date > oneDayAgo) { // If the date is within the last 24 hours
    return formatDistanceToNowStrict(date, { addSuffix: true });
  }
  return format(date, includeTime ? 'MMM d, yyyy p' : 'PPP');
};


export default async function JobDetailPage({ params: routeParams }: { params: { jobId: string } }) {
  // Await params as suggested by the Next.js error message for dynamic server components
  const params = await routeParams;
  const jobId = params.jobId;
  console.log(`[JobDetailPage] Resolved jobId: ${jobId}`);

  const { job, quotes, error } = await fetchJobDetailsPageDataAction(jobId);

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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/search">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
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
                job.status === 'open' ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700' : 
                job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700' :
                job.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700' :
                job.status === 'assigned' ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-800/30 dark:text-purple-300 dark:border-purple-700' :
                'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700' 
              }`}
            >
              {job.status.replace('_', ' ')}
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
            
            <MarkAsCompletedButton 
                jobId={job.id} 
                currentJobStatus={job.status} 
                jobClientId={job.clientId} 
            />

            {job.status === 'open' && (
              <SubmitQuoteForm jobId={jobId} clientId={job.clientId} />
            )}
            
            <SubmitReviewForm 
                jobId={job.id} 
                providerId={job.assignedProviderId} 
                clientId={job.clientId} 
                currentJobStatus={job.status} 
            />


             {quotes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Received Quotes ({quotes.length})</h3>
                  <div className="space-y-4">
                    {quotes.map(quote => (
                      <Card key={quote.id} className="bg-muted/20 dark:bg-muted/50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={quote.providerDetails?.profilePictureUrl || undefined} alt={quote.providerDetails?.businessName} data-ai-hint="provider avatar" />
                                    <AvatarFallback>
                                    {quote.providerDetails?.businessName ? quote.providerDetails.businessName.substring(0,1).toUpperCase() : "P"}
                                    </AvatarFallback>
                                </Avatar>
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
                             <AcceptRejectQuoteButtons jobId={job.id} quote={quote} currentUserId={null} /> 
                           )}
                           {quote.status === 'accepted' && job.status !== 'completed' && (
                             <p className="text-sm text-green-600 font-medium mt-2">This quote has been accepted for the job.</p>
                           )}
                           {quote.status === 'accepted' && job.status === 'completed' && (
                             <p className="text-sm text-green-700 font-medium mt-2">This quote was accepted and the job is now complete.</p>
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

// Minimal Avatar components for this page, can be removed if Avatar from ui/avatar is globally available and styled
const Avatar: React.FC<{className?: string, children: React.ReactNode}> = ({ className, children }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>
    {children}
  </div>
);
const AvatarImage: React.FC<{src?: string | null, alt?: string, "data-ai-hint"?: string}> = ({src, alt, ...props}) => (
  src ? <Image src={src} alt={alt || ""} fill style={{objectFit: 'cover'}} {...props} /> : null
);
const AvatarFallback: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
    {children}
  </div>
);

