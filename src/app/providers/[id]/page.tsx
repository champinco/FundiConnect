
"use client"; 

import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { useEffect, useState } from 'react'; 
import { Star, MapPin, CheckCircle2, Briefcase, MessageSquare, Phone, Upload, Loader2, Clock, Images, MessageCircle, ThumbsUp, ExternalLink, Tag, BookOpen, CalendarDays, Sparkles, Edit3, BellRing, Twitter, Instagram, Facebook, Linkedin } from 'lucide-react';
import VerifiedBadge from '@/components/verified-badge';
import ServiceCategoryIcon from '@/components/service-category-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast"; 
import ProviderProfileSkeleton from '@/components/skeletons/provider-profile-skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';


import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'; 
import { auth } from '@/lib/firebase'; 
import type { ProviderProfile } from '@/models/provider'; 
import type { Review } from '@/models/review';
import Link from 'next/link'; 
import { format, parseISO, isSameDay } from 'date-fns';
import { formatDynamicDate } from '@/lib/dateUtils';
import { fetchPublicProviderProfileDataAction, requestBookingAction } from './actions';
import { getOrCreateChatAction } from '@/app/messages/actions';

export default function ProviderProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const providerId = params.id;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedBookingDate, setSelectedBookingDate] = useState<Date | undefined>(undefined);
  const [bookingMessage, setBookingMessage] = useState("");
  const [isRequestingBooking, setIsRequestingBooking] = useState(false);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (providerId) {
      setIsLoading(true); 
      setError(null);
      fetchPublicProviderProfileDataAction(providerId)
        .then((data) => {
          if (data.error) {
            setError(data.error);
            setProvider(null);
            setReviews([]);
          } else {
            setProvider(data.provider);
            setReviews(data.reviews || []); 
          }
        })
        .catch(err => {
          const errorMessage = err.message || "An unexpected error occurred while loading provider data.";
          setError(errorMessage);
          setProvider(null);
          setReviews([]);
        })
        .finally(() => setIsLoading(false)); 
    }
  }, [providerId]);

  const handleInitiateChat = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to message providers.", variant: "destructive" });
      router.push(`/auth/login?redirect=/providers/${providerId}`);
      return;
    }
    if (!provider) return;

    setIsChatLoading(true);
    try {
      const result = await getOrCreateChatAction(currentUser.uid, provider.userId); 
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
  
  const handleRequestBookingSubmit = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to request a booking.", variant: "destructive" });
      setIsBookingDialogOpen(false);
      router.push(`/auth/login?redirect=/providers/${providerId}`);
      return;
    }
    if (!provider || !selectedBookingDate) {
      toast({ title: "Missing Information", description: "Please select a date for your booking.", variant: "destructive" });
      return;
    }

    setIsRequestingBooking(true);
    try {
      const result = await requestBookingAction(provider.id, currentUser.uid, selectedBookingDate, bookingMessage);
      if (result.success) {
        toast({ title: "Booking Request Sent!", description: "The provider has been notified. You can track the status in your dashboard." });
        setIsBookingDialogOpen(false);
        setSelectedBookingDate(undefined);
        setBookingMessage("");
      } else {
        toast({ title: "Booking Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not send booking request.", variant: "destructive" });
    } finally {
      setIsRequestingBooking(false);
    }
  };

  if (isLoading) { 
    return <ProviderProfileSkeleton />;
  }

  if (error || !provider) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader><CardTitle>{error ? "Error Loading Profile" : "Provider Not Found"}</CardTitle></CardHeader>
            <CardContent>
                <MessageCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">{error || "The provider profile you are looking for does not exist or could not be loaded."}</p>
                <Button asChild className="mt-6"><Link href="/search">Back to Search</Link></Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0,0,0,0); 

  const providerUnavailableDatesParsed = (provider.unavailableDates || []).map(dateStr => parseISO(dateStr));
  const isDateDisabled = (date: Date): boolean => {
    if (date < today) return true;
    return providerUnavailableDatesParsed.some(unavailableDate => isSameDay(unavailableDate, date));
  };
  
  const socialMediaPlatforms = [
    { key: 'twitter', Icon: Twitter, color: 'text-sky-500', name: 'Twitter' },
    { key: 'instagram', Icon: Instagram, color: 'text-pink-600', name: 'Instagram' },
    { key: 'facebook', Icon: Facebook, color: 'text-blue-700', name: 'Facebook' },
    { key: 'linkedin', Icon: Linkedin, color: 'text-sky-700', name: 'LinkedIn' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-0 dark:from-primary/20 dark:to-accent/20">
          <div className="relative h-64 md:h-80 w-full">
            <Image
              src={provider.bannerImageUrl || provider.profilePictureUrl || 'https://placehold.co/1200x400.png'}
              alt={`${provider.businessName} cover image`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              data-ai-hint={provider.bannerImageUrl ? "business cover" : "workshop tools"}
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-6 md:p-8">
                <div className="flex items-start md:items-center space-x-4">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-lg overflow-hidden shrink-0">
                        <Image src={provider.profilePictureUrl || 'https://placehold.co/300x300.png'} alt={provider.businessName} fill style={{ objectFit: 'cover' }} data-ai-hint="professional portrait"/>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>{provider.businessName}</h1>
                        <div className="flex items-center space-x-2 mt-1">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-semibold">{(provider.rating || 0).toFixed(1)} ({provider.reviewsCount || 0} reviews)</span>
                        </div>
                         {provider.isVerified && provider.verificationAuthority && (
                            <div className="mt-2">
                            <VerifiedBadge authority={`${provider.verificationAuthority} Verified`} isVerified={provider.isVerified} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="portfolio">Portfolio ({provider.portfolio?.length || 0})</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="about">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">About {provider.businessName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-foreground/90">
                      <p className="whitespace-pre-line">{provider.bio || "No biography provided."}</p>
                      
                      {provider.specialties && provider.specialties.length > 0 && (
                        <div className="pt-3">
                          <h4 className="font-semibold mb-2 text-md flex items-center"><Sparkles className="h-5 w-5 mr-2 text-primary" />Specialties:</h4>
                          <div className="flex flex-wrap gap-2">
                            {provider.specialties.map(spec => <Badge key={spec} variant="secondary" className="text-sm">{spec}</Badge>)}
                          </div>
                        </div>
                      )}

                      {provider.skills && provider.skills.length > 0 && (
                        <div className="pt-3">
                          <h4 className="font-semibold mb-2 text-md flex items-center"><Tag className="h-5 w-5 mr-2 text-primary" />Skills:</h4>
                           <div className="flex flex-wrap gap-2">
                            {provider.skills.map(skill => <Badge key={skill} variant="outline" className="text-sm">{skill}</Badge>)}
                          </div>
                        </div>
                      )}

                       {provider.yearsOfExperience > 0 && (
                        <div className="pt-3">
                          <h4 className="font-semibold mb-2 text-md flex items-center"><Award className="h-5 w-5 mr-2 text-primary" />Years of Experience:</h4>
                          <p>{provider.yearsOfExperience} years</p>
                        </div>
                       )}
                       {provider.certifications && provider.certifications.length > 0 && (
                         <div className="pt-4 mt-4 border-t">
                          <h4 className="font-semibold mb-3 text-lg flex items-center"><BookOpen className="h-5 w-5 mr-2 text-primary" />Certifications & Licenses</h4>
                          <ul className="space-y-3">
                            {provider.certifications.map(cert => (
                              <li key={cert.id || cert.name} className="p-3 border rounded-md bg-card shadow-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <div>
                                    <p className="font-medium text-base">{cert.name}</p>
                                    <p className="text-xs text-muted-foreground">Number: {cert.number || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">Body: {cert.issuingBody}</p>
                                  </div>
                                  <Badge variant={
                                    cert.status === 'verified' ? 'default' :
                                    cert.status === 'pending_review' ? 'secondary' :
                                    cert.status === 'requires_attention' ? 'destructive' :
                                    cert.status === 'expired' ? 'outline' : 'outline'
                                  } className="capitalize text-xs shrink-0 ml-2">
                                    {cert.status ? cert.status.replace('_', ' ') : 'Status Unknown'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                                  {cert.issueDate && <span>Issued: {format(new Date(cert.issueDate), 'MMM d, yyyy')}</span>}
                                  {cert.expiryDate && <span>Expires: {format(new Date(cert.expiryDate), 'MMM d, yyyy')}</span>}
                                </div>
                                {cert.documentUrl && (cert.status === 'verified' || cert.status === 'pending_review') && (
                                  <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-flex items-center">
                                    <ExternalLink className="h-3 w-3 mr-1" /> View Document
                                  </a>
                                )}
                                {cert.verificationNotes && (cert.status === 'requires_attention' || cert.status === 'expired') && (
                                  <p className="text-xs text-destructive mt-1">Note: {cert.verificationNotes}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                       )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="portfolio">
                   <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {provider.portfolio && provider.portfolio.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {provider.portfolio.map(item => (
                            <div key={item.id || item.imageUrl} className="rounded-lg overflow-hidden shadow group aspect-video relative border">
                              <Image 
                                src={item.imageUrl || 'https://placehold.co/600x400.png'} 
                                alt={item.description || 'Portfolio item'} 
                                fill 
                                style={{objectFit: 'cover'}} 
                                className="transition-transform duration-300 group-hover:scale-105" 
                                data-ai-hint={item.dataAiHint || item.description?.split(' ').slice(0,2).join(' ') || 'project image'}
                              />
                              {item.imageUrl && item.description && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <p className="text-sm text-white truncate">{item.description}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Images className="h-16 w-16 mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No Portfolio Items Yet</p>
                            <p className="text-sm">This provider hasn't uploaded any portfolio images.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="reviews">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Client Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {isLoading && (!reviews || reviews.length === 0) ? ( 
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex space-x-3 border-b pb-4 last:border-b-0">
                              <Avatar className="h-10 w-10 opacity-50"><AvatarFallback>C</AvatarFallback></Avatar>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between items-center">
                                   <Skeleton className="h-4 bg-muted rounded w-1/3 animate-pulse"></Skeleton>
                                   <Skeleton className="h-3 bg-muted rounded w-1/4 animate-pulse"></Skeleton>
                                </div>
                                <Skeleton className="h-3 bg-muted rounded w-1/5 animate-pulse mb-1.5"></Skeleton>
                                <Skeleton className="h-4 bg-muted rounded w-full animate-pulse"></Skeleton>
                                <Skeleton className="h-4 bg-muted rounded w-5/6 animate-pulse"></Skeleton>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : reviews && reviews.length > 0 ? reviews.map(review => (
                        <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={review.clientDetails?.photoURL || undefined} alt={review.clientDetails?.name || "Client"} data-ai-hint="client avatar" />
                                <AvatarFallback>{review.clientDetails?.name ? review.clientDetails.name.substring(0,1).toUpperCase() : "C"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold text-sm">{review.clientDetails?.name || "Anonymous Client"}</h4>
                                    <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-4 w-4 ${i < (review.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                                    ))}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1.5">
                                    {review.reviewDate ? formatDynamicDate(review.reviewDate) : 'Date N/A'}
                                </p>
                                <p className="text-sm text-foreground/90 whitespace-pre-line">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <ThumbsUp className="h-16 w-16 mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No Reviews Yet</p>
                            <p className="text-sm">Be the first to review this provider after a completed job!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Contact & Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                    <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{provider.location || "Not specified"}</p>
                         {provider.fullAddress && <p className="text-xs text-muted-foreground">{provider.fullAddress}</p>}
                    </div>
                  </div>
                   <div className="flex items-start">
                    <Briefcase className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                     <div>
                        <p className="font-medium">Main Service</p>
                         <div className="flex items-center text-muted-foreground">
                           <ServiceCategoryIcon category={provider.mainService || 'Other'} iconOnly className="h-4 w-4 mr-1.5"/>
                           {provider.mainService || 'Other'}
                         </div>
                    </div>
                  </div>
                  {provider.operatingHours && (
                    <div className="flex items-start">
                        <Clock className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                        <div>
                            <p className="font-medium">Operating Hours</p>
                            <p className="text-muted-foreground whitespace-pre-line">{provider.operatingHours}</p>
                        </div>
                    </div>
                  )}
                   {provider.receivesEmergencyJobAlerts && (
                    <div className="flex items-start text-orange-600 dark:text-orange-400">
                      <BellRing className="h-5 w-5 mr-3 mt-1 shrink-0" />
                      <div>
                        <p className="font-medium">Accepts Emergency Jobs</p>
                      </div>
                    </div>
                  )}
                  
                  {provider.website && (
                    <div className="flex items-start">
                      <ExternalLink className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {provider.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {provider.socialMediaLinks && Object.keys(provider.socialMediaLinks).length > 0 && (
                    <div className="pt-2">
                      <p className="font-medium mb-2">Social Media</p>
                      <div className="flex items-center space-x-3">
                        {socialMediaPlatforms.map(({ key, Icon, color, name }) => (
                          provider.socialMediaLinks![key] && (
                            <a
                              key={key}
                              href={provider.socialMediaLinks![key].startsWith('http') ? provider.socialMediaLinks![key] : `https://${provider.socialMediaLinks![key]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={name}
                              className={`hover:opacity-75 transition-opacity ${color}`}
                            >
                              <Icon className="h-6 w-6" />
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />
                  { currentUser?.uid !== provider.userId && (
                    <>
                    <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                                <CalendarDays className="mr-2 h-4 w-4" /> Request Booking
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Request Booking with {provider.businessName}</DialogTitle>
                            <DialogDescription>
                            Select your preferred date and add a message for the provider.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                            <Label htmlFor="booking-date">Preferred Date</Label>
                            <Calendar
                                mode="single"
                                selected={selectedBookingDate}
                                onSelect={setSelectedBookingDate}
                                className="rounded-md border"
                                disabled={isDateDisabled}
                            />
                            </div>
                            <div className="grid gap-2">
                            <Label htmlFor="booking-message">Message (Optional)</Label>
                            <Textarea
                                id="booking-message"
                                placeholder="Briefly describe your needs or any specific requests."
                                value={bookingMessage}
                                onChange={(e) => setBookingMessage(e.target.value)}
                                className="min-h-[100px]"
                            />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" onClick={handleRequestBookingSubmit} disabled={isRequestingBooking || !selectedBookingDate}>
                            {isRequestingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Request
                            </Button>
                        </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={handleInitiateChat} variant="outline" className="w-full" disabled={isChatLoading}>
                        {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Message {provider.businessName?.split(' ')[0] || 'Provider'}
                    </Button>
                    </>
                  )}
                  {provider.contactPhoneNumber && (
                    <Button variant="outline" className="w-full" onClick={() => toast({title: "Contact Information", description: `Phone: ${provider.contactPhoneNumber}. Please use in-app messaging or booking requests for initial contact.`})}>
                        <Phone className="mr-2 h-4 w-4" /> Show Contact Info
                    </Button>
                  )}
                   {currentUser?.uid === provider.userId && (
                     <Button asChild className="w-full">
                       <Link href="/profile/edit"><Edit3 className="mr-2 h-4 w-4" /> Edit Your Profile</Link>
                     </Button>
                   )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
);
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' '); 
