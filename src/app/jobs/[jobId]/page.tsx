
import { getJobByIdFromFirestore } from '@/services/jobService';
import { getQuotesForJob } from '@/services/quoteService';
import type { Job } from '@/models/job';
import type { Quote } from '@/models/quote';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCategoryIcon from '@/components/service-category-icon';
import { MapPin, CalendarDays, Briefcase, UserCircle, Edit, MessageSquare, CheckCircle, XCircle, Loader2, ShieldCheck, ArrowLeft, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import SubmitQuoteForm from './components/submit-quote-form';
import { auth } from '@/lib/firebase'; // We'll need auth to check user role for UI elements
import { getUserProfileFromFirestore } from '@/services/userService'; // To get account type
import AcceptRejectQuoteButtons from './components/accept-reject-quote-buttons';


export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const jobId = params.jobId;
  const job = await getJobByIdFromFirestore(jobId);
  const quotes = await getQuotesForJob(jobId); // Fetch quotes for this job

  // This page is a server component, so direct auth access needs care.
  // For now, let's assume we'll pass user info or make components client-side for interactions.
  // const currentUser = auth.currentUser; // This won't work directly in RSC for current session
  // For MVP, a Fundi sees the submit quote form. A Client sees received quotes.

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The job you are looking for does not exist or could not be loaded.</p>
            <Button asChild className="mt-4">
              <Link href="/search">Find Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // A simple way to check if the current user (if any, for UI display) is the client who posted.
  // This would ideally be done in a client component or by passing user data down.
  // For now, this is a placeholder idea for UI logic separation.
  // const isClientOwner = currentUser?.uid === job.clientId;
  // const isProvider = currentUser && !isClientOwner; // Simplified check

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
                job.status === 'open' ? 'bg-blue-100 text-blue-700 border-blue-300' : 
                job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                job.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                job.status === 'assigned' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                'bg-gray-100 text-gray-700 border-gray-300' 
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
            
            {/* Placeholder for Provider: Display submit quote form if user is a provider and job is open */}
            {/* This logic needs to be more robust, likely in a client component with auth context */}
            {job.status === 'open' && (
              <SubmitQuoteForm jobId={jobId} clientId={job.clientId} />
            )}


            {/* Client: Display received quotes */}
            {/* This logic also needs to be more robust for client view */}
             {quotes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Received Quotes ({quotes.length})</h3>
                  <div className="space-y-4">
                    {quotes.map(quote => (
                      <Card key={quote.id} className="bg-muted/50">
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
                                    Sent: {format(new Date(quote.createdAt), 'MMM d, yyyy p')}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={quote.status === 'accepted' ? 'default' : 'outline'} className={`capitalize ${quote.status === 'accepted' ? 'bg-green-500 text-white' : ''}`}>
                                {quote.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-primary mb-2">{quote.currency} {quote.amount.toLocaleString()}</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line mb-3">{quote.messageToClient}</p>
                           {/* Placeholder for action buttons - only client who posted job & job is open/pending_quotes */}
                           {job.status === 'open' || job.status === 'pending_quotes' ? (
                             <AcceptRejectQuoteButtons jobId={job.id} quote={quote} currentUserId={"NEEDS_ACTUAL_USER_ID_CLIENT_COMPONENT"} />
                           ) : quote.status === 'accepted' ? (
                             <p className="text-sm text-green-600 font-medium">This quote has been accepted.</p>
                           ) : null }
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {job.status === 'open' && quotes.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No quotes received yet for this job.</p>
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
                  <span className="text-muted-foreground">Posted: {format(new Date(job.postedAt), 'PPP')}</span>
                </div>
                {job.deadline && (
                   <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-muted-foreground">Deadline: {format(new Date(job.deadline), 'PPP')}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">Client ID: {job.clientId.substring(0, 10)}...</span> {/* Show partial for privacy/brevity */}
                </div>
                <div className="flex items-center">
                   <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-muted-foreground">Quotes Received: {job.quotesReceived || 0}</span>
                </div>
                {job.assignedProviderId && (
                  <div className="flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-muted-foreground">Assigned To: <Link href={`/providers/${job.assignedProviderId}`} className="text-primary hover:underline">{job.assignedProviderId.substring(0,10)}...</Link></span>
                  </div>
                )}
              </CardContent>
            </Card>

             {/* Placeholder for Client Actions like Edit Job (if they are the owner and job is open) */}
             {/* {isClientOwner && job.status === 'open' && (
                <Button variant="outline" className="w-full mt-4">
                    <Edit className="mr-2 h-4 w-4" /> Edit Job (Coming Soon)
                </Button>
             )} */}

          </aside>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper components for Avatar (if not globally available, or use ShadCN's)
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
