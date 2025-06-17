
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import type { Job } from '@/models/job';
import type { BookingRequest, BookingStatus } from '@/models/booking';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Briefcase, Edit, Search, PlusCircle, LayoutDashboard, ListChecks, FileText, Star, Users, AlertCircle, CalendarClock, Check, X, MessageSquare } from 'lucide-react';
import { formatDynamicDate } from '@/lib/dateUtils'; 
import { format } from 'date-fns';
import { fetchDashboardDataAction, type DashboardPageData } from './actions';
import { providerRespondToBookingAction } from '@/app/actions/booking_actions';
import type { ClientJobSummary } from '@/services/jobService';
import type { ProviderQuoteSummary } from '@/services/quoteService';
import { useToast } from '@/hooks/use-toast';


interface ClientDashboardDisplayData {
  jobSummary: ClientJobSummary;
  clientBookings: BookingRequest[];
}

interface ProviderDashboardDisplayData {
  providerProfile: ProviderProfile | null;
  quoteSummary: ProviderQuoteSummary;
  assignedJobs: Job[];
  providerBookings: BookingRequest[];
}

type DashboardDisplayData = ClientDashboardDisplayData | ProviderDashboardDisplayData | null;


export default function DashboardPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [dashboardDisplayData, setDashboardDisplayData] = useState<DashboardDisplayData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For provider booking response dialog
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [bookingResponseAction, setBookingResponseAction] = useState<'confirmed' | 'rejected' | null>(null);
  const [providerMessage, setProviderMessage] = useState('');
  const [isRespondingToBooking, setIsRespondingToBooking] = useState(false);

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    const result = await fetchDashboardDataAction(userId);
    if (result.error) {
      setError(result.error);
      setAppUser(null);
      setDashboardDisplayData(null);
    } else {
      setAppUser(result.appUser);
      if (result.appUser?.accountType === 'client' && result.dashboardData && 'jobSummary' in result.dashboardData && 'clientBookings' in result.dashboardData) {
        setDashboardDisplayData(result.dashboardData as ClientDashboardDisplayData);
      } else if (result.appUser?.accountType === 'provider' && result.dashboardData && 'providerProfile' in result.dashboardData && 'providerBookings' in result.dashboardData) {
         setDashboardDisplayData(result.dashboardData as ProviderDashboardDisplayData);
      } else {
        setDashboardDisplayData(null); 
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchData(user.uid);
      } else {
        setIsLoading(false);
        setAppUser(null);
        setDashboardDisplayData(null);
        setError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleBookingResponse = async () => {
    if (!selectedBooking || !bookingResponseAction || !currentUser) return;
    setIsRespondingToBooking(true);
    const result = await providerRespondToBookingAction(selectedBooking.id, currentUser.uid, bookingResponseAction, providerMessage);
    if (result.success) {
      toast({ title: "Booking Updated", description: result.message });
      setSelectedBooking(null);
      setBookingResponseAction(null);
      setProviderMessage('');
      if(currentUser) fetchData(currentUser.uid); // Refresh dashboard data
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsRespondingToBooking(false);
  };
  
  const openBookingResponseDialog = (booking: BookingRequest, action: 'confirmed' | 'rejected') => {
    setSelectedBooking(booking);
    setBookingResponseAction(action);
    setProviderMessage(''); // Reset message
  };
  
  const clientData = useMemo(() => appUser?.accountType === 'client' && dashboardDisplayData && 'jobSummary' in dashboardDisplayData ? dashboardDisplayData as ClientDashboardDisplayData : null, [appUser, dashboardDisplayData]);
  const providerData = useMemo(() => appUser?.accountType === 'provider' && dashboardDisplayData && 'providerProfile' in dashboardDisplayData ? dashboardDisplayData as ProviderDashboardDisplayData : null, [appUser, dashboardDisplayData]);


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!currentUser) {
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

  if (error || !appUser) {
    return (
       <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
             <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Dashboard Error</CardTitle>
            <CardDescription>{error || "We couldn't find your application profile details. This can happen if account setup didn't complete fully. Please try refreshing the page, or logging out and then logging back in. If the issue continues, please contact support."}</CardDescription>
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

  const renderBookingStatusBadge = (status: BookingStatus) => {
    let colorClasses = "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700";
    if (status === 'pending') colorClasses = "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700";
    else if (status === 'confirmed') colorClasses = "bg-green-100 text-green-700 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700";
    else if (status === 'rejected' || status === 'cancelled_by_client' || status === 'cancelled_by_provider') colorClasses = "bg-red-100 text-red-700 border-red-300 dark:bg-red-800/30 dark:text-red-300 dark:border-red-700";
    else if (status === 'completed') colorClasses = "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700";
    
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${colorClasses}`}>{status.replace('_', ' ')}</span>;
  };
  

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

      {appUser.accountType === 'client' && clientData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><ListChecks className="mr-3 h-7 w-7 text-primary" />Job Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <p>Open Jobs: <span className="font-semibold text-lg text-primary">{clientData.jobSummary.open}</span></p>
              <p>Assigned/In Progress: <span className="font-semibold text-lg text-primary">{clientData.jobSummary.assigned + clientData.jobSummary.inProgress}</span></p>
              <p>Completed Jobs: <span className="font-semibold text-lg text-primary">{clientData.jobSummary.completed}</span></p>
              <Link href="/search?myJobs=true&status=all_my" className="hover:text-primary hover:underline block">
                Total Jobs Posted: <span className="font-semibold text-lg text-primary">{clientData.jobSummary.total}</span>
              </Link>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button asChild className="w-full sm:flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/jobs/post"><PlusCircle className="mr-2" /> Post New Job</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:flex-1">
                <Link href="/search?myJobs=true&status=all_my"><Briefcase className="mr-2" /> View My Jobs</Link>
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
                    <Link href="/search?mode=providers">Browse Fundis</Link>
                </Button>
            </CardFooter>
          </Card>

          {/* Client Booking Requests Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><CalendarClock className="mr-3 h-7 w-7 text-primary" />My Booking Requests ({clientData.clientBookings.length})</CardTitle>
              <CardDescription>Track the status of your booking requests with Fundis.</CardDescription>
            </CardHeader>
            <CardContent>
              {clientData.clientBookings.length > 0 ? (
                <ul className="space-y-4 max-h-96 overflow-y-auto">
                  {clientData.clientBookings.map(booking => (
                    <li key={booking.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={booking.providerDetails?.photoURL || undefined} alt={booking.providerDetails?.businessName || 'Provider'} data-ai-hint="provider avatar"/>
                                <AvatarFallback>{booking.providerDetails?.businessName ? booking.providerDetails.businessName.substring(0,1).toUpperCase() : "P"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-semibold truncate text-md">{booking.providerDetails?.businessName || 'Provider'}</h4>
                                <p className="text-xs text-muted-foreground">Requested: {format(new Date(booking.requestedDate), 'PPP')}</p>
                            </div>
                        </div>
                        {renderBookingStatusBadge(booking.status)}
                        {booking.providerResponseMessage && <p className="text-xs text-muted-foreground mt-1.5 italic">Provider: "{booking.providerResponseMessage}"</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">You haven't made any booking requests yet.</p>
                 </div>
              )}
            </CardContent>
             {clientData.clientBookings.length > 0 && (
                 <CardFooter className="pt-6">
                    <Button asChild variant="link" className="w-full">
                        <Link href="/search?mode=providers">Request More Bookings</Link>
                    </Button>
                 </CardFooter>
            )}
          </Card>
        </div>
      )}

      {appUser.accountType === 'provider' && providerData && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><Star className="mr-3 h-7 w-7 text-yellow-400 fill-yellow-400" />Your Rating</CardTitle>
            </CardHeader>
            <CardContent>
              {providerData.providerProfile ? (
                <>
                  <p className="text-4xl font-bold text-primary">{providerData.providerProfile.rating.toFixed(1)} <span className="text-xl font-normal text-muted-foreground">/ 5.0</span></p>
                  <p className="text-sm text-muted-foreground mt-1">Based on {providerData.providerProfile.reviewsCount} reviews</p>
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
              <p>Pending Quotes: <span className="font-semibold text-lg text-primary">{providerData.quoteSummary.pending}</span></p>
              <p>Accepted Quotes: <span className="font-semibold text-lg text-primary">{providerData.quoteSummary.accepted}</span></p>
              <p>Total Submitted: <span className="font-semibold text-lg text-primary">{providerData.quoteSummary.total}</span></p>
            </CardContent>
             <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button asChild className="w-full sm:flex-1 bg-primary hover:bg-primary/90">
                  <Link href="/search?mode=jobs"><Search className="mr-2" /> Browse Open Jobs</Link>
                </Button>
                 <Button asChild variant="outline" className="w-full sm:flex-1">
                  <Link href="/profile/edit"><Edit className="mr-2" /> Edit Profile</Link>
                </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><Briefcase className="mr-3 h-7 w-7 text-primary" />Active Jobs ({providerData.assignedJobs.length})</CardTitle>
              <CardDescription>Jobs currently assigned to you or in progress.</CardDescription>
            </CardHeader>
            <CardContent>
              {providerData.assignedJobs.length > 0 ? (
                <ul className="space-y-4 max-h-60 overflow-y-auto">
                  {providerData.assignedJobs.map(job => (
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
            {providerData.assignedJobs.length > 0 && (
                 <CardFooter className="pt-6">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/search?myJobs=true&status=assigned">View All My Active Jobs</Link>
                    </Button>
                 </CardFooter>
            )}
          </Card>

          {/* Provider Booking Requests Card */}
          <Card className="shadow-md hover:shadow-lg transition-shadow md:col-span-3">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl"><CalendarClock className="mr-3 h-7 w-7 text-primary" />Incoming Booking Requests ({providerData.providerBookings.filter(b => b.status === 'pending').length} Pending)</CardTitle>
              <CardDescription>Manage booking requests from clients.</CardDescription>
            </CardHeader>
            <CardContent>
              {providerData.providerBookings.length > 0 ? (
                <ul className="space-y-4 max-h-[500px] overflow-y-auto">
                  {providerData.providerBookings.sort((a,b) => a.status === 'pending' ? -1 : 1).map(booking => ( // Show pending first
                    <li key={booking.id} className="p-4 border rounded-lg shadow-sm bg-card">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-12 w-12">
                              <AvatarImage src={booking.clientDetails?.photoURL || undefined} alt={booking.clientDetails?.name || 'Client'} data-ai-hint="client avatar"/>
                              <AvatarFallback>{booking.clientDetails?.name ? booking.clientDetails.name.substring(0,1).toUpperCase() : "C"}</AvatarFallback>
                          </Avatar>
                          <div>
                              <h4 className="font-semibold text-md">{booking.clientDetails?.name || 'Client'}</h4>
                              {booking.clientDetails?.email && <p className="text-xs text-muted-foreground">{booking.clientDetails.email}</p>}
                              <p className="text-sm text-muted-foreground">Requested: <span className="font-medium text-foreground">{format(new Date(booking.requestedDate), 'PPP')}</span></p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">{renderBookingStatusBadge(booking.status)}</div>
                      </div>
                      {booking.messageToProvider && <p className="text-sm text-muted-foreground mt-2 pl-14 sm:pl-16 italic">Client message: "{booking.messageToProvider}"</p>}
                       {booking.providerResponseMessage && <p className="text-sm text-muted-foreground mt-2 pl-14 sm:pl-16">Your response: "{booking.providerResponseMessage}"</p>}
                      {booking.status === 'pending' && (
                        <div className="mt-3 pl-14 sm:pl-16 flex flex-col sm:flex-row gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openBookingResponseDialog(booking, 'confirmed')}>
                                <Check className="mr-1.5 h-4 w-4" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => openBookingResponseDialog(booking, 'rejected')}>
                                <X className="mr-1.5 h-4 w-4" /> Reject
                            </Button>
                             <Button size="sm" variant="ghost" className="text-primary" asChild>
                                <Link href={`/messages/${[currentUser.uid, booking.clientId].sort().join('_')}`}><MessageSquare className="mr-1.5 h-4 w-4"/>Message Client</Link>
                            </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-10">
                    <CalendarClock className="mx-auto h-16 w-16 text-muted-foreground mb-3 opacity-60" />
                    <p className="text-muted-foreground">No booking requests at this time.</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Dialog for Provider to Respond to Booking */}
      <Dialog open={!!(selectedBooking && bookingResponseAction)} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedBooking(null); setBookingResponseAction(null); setProviderMessage(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Booking Request</DialogTitle>
            <DialogDescription>
              You are about to {bookingResponseAction} the booking requested by {selectedBooking?.clientDetails?.name || "Client"} for {selectedBooking ? format(new Date(selectedBooking.requestedDate), 'PPP') : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="providerMessage">Optional Message to Client</Label>
            <Textarea 
              id="providerMessage" 
              value={providerMessage} 
              onChange={(e) => setProviderMessage(e.target.value)} 
              placeholder={`e.g., Looking forward to it! Please confirm details... or Unfortunately, I am not available on that day.`}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBooking(null); setBookingResponseAction(null); setProviderMessage(''); }} disabled={isRespondingToBooking}>Cancel</Button>
            <Button 
              onClick={handleBookingResponse} 
              disabled={isRespondingToBooking}
              className={bookingResponseAction === 'confirmed' ? "bg-green-600 hover:bg-green-700 text-white" : bookingResponseAction === 'rejected' ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {isRespondingToBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bookingResponseAction === 'confirmed' ? "Confirm Booking" : "Reject Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

