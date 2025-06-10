
"use client"; 

import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { useEffect, useState } from 'react'; 
import { Star, MapPin, CheckCircle2, Briefcase, MessageSquare, Phone, Upload, Loader2, Clock, Images, MessageCircle, ThumbsUp } from 'lucide-react';
import VerifiedBadge from '@/components/verified-badge';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast"; 
import ProviderProfileSkeleton from '@/components/skeletons/provider-profile-skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Ensured Avatar components are imported

import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'; 
import { auth } from '@/lib/firebase'; 
import { getOrCreateChat } from '@/services/chatService'; 
import type { ProviderProfile } from '@/models/provider'; 
import { getProviderProfileFromFirestore } from '@/services/providerService'; 
import type { Review } from '@/models/review';
import { getReviewsForProvider } from '@/services/reviewService';
import Link from 'next/link'; 
import { formatDistanceToNowStrict } from 'date-fns';

export default function ProviderProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const providerId = params.id;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true); // For reviews specifically
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (providerId) {
      setIsLoading(true); // For overall profile
      setIsLoadingReviews(true); // For reviews part

      getProviderProfileFromFirestore(providerId)
        .then((profile) => {
          if (profile) {
            setProvider(profile);
          } else {
            toast({ title: "Error", description: "Provider profile not found.", variant: "destructive" });
          }
        })
        .catch(error => {
          console.error("Error fetching provider profile:", error);
          toast({ title: "Error", description: "Could not load provider profile.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false)); // Overall profile loading done

      getReviewsForProvider(providerId)
        .then((fetchedReviews) => {
           // Sort reviews by date, newest first
          setReviews(fetchedReviews.sort((a,b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()));
        })
        .catch(error => {
          console.error("Error fetching reviews:", error);
          toast({ title: "Error", description: "Could not load reviews for this provider.", variant: "destructive" });
        })
        .finally(() => setIsLoadingReviews(false)); // Reviews loading done
    }
  }, [providerId, toast]);

  const handleRequestQuote = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to contact providers.", variant: "destructive" });
      router.push(`/auth/login?redirect=/providers/${providerId}`);
      return;
    }
    if (!provider) return;

    setIsChatLoading(true);
    try {
      const chatId = await getOrCreateChat(currentUser.uid, provider.userId); 
      router.push(`/messages/${chatId}`);
    } catch (error: any) {
      console.error("Error creating or getting chat:", error);
      toast({ title: "Error", description: error.message || "Could not start conversation.", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };
  
  if (isLoading) { // Show main skeleton if provider profile is still loading
    return <ProviderProfileSkeleton />;
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader><CardTitle>Provider Not Found</CardTitle></CardHeader>
            <CardContent>
                <MessageCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">The provider profile you are looking for does not exist or could not be loaded.</p>
                <Button asChild className="mt-6"><Link href="/search">Back to Search</Link></Button>
            </CardContent>
        </Card>
      </div>
    );
  }

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
              data-ai-hint="workshop tools"
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
                            <span className="text-white font-semibold">{provider.rating.toFixed(1)} ({provider.reviewsCount} reviews)</span>
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
                  <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({isLoadingReviews ? '...' : reviews.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="about">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">About {provider.businessName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-foreground/90">
                      <p className="whitespace-pre-line">{provider.bio}</p>
                      {provider.specialties && provider.specialties.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-1">Specialties:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {provider.specialties.map(spec => <li key={spec}>{spec}</li>)}
                          </ul>
                        </div>
                      )}
                       {provider.yearsOfExperience > 0 && (
                        <div>
                          <h4 className="font-semibold mb-1">Years of Experience:</h4>
                          <p>{provider.yearsOfExperience} years</p>
                        </div>
                       )}
                       {provider.certifications && provider.certifications.length > 0 && (
                         <div>
                          <h4 className="font-semibold mb-1">Certifications:</h4>
                          <ul className="space-y-1">
                            {provider.certifications.map(cert => (
                              <li key={cert.name} className="flex items-center">
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600 shrink-0" /> 
                                {cert.name} {cert.number && `(${cert.number})`}
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
                            <div key={item.id} className="rounded-lg overflow-hidden shadow group aspect-video relative border">
                              <Image src={item.imageUrl} alt={item.description} fill style={{objectFit: 'cover'}} className="transition-transform duration-300 group-hover:scale-105" data-ai-hint={item.dataAiHint || 'project image'}/>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <p className="text-sm text-white truncate">{item.description}</p>
                              </div>
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
                      {isLoadingReviews ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex space-x-3 border-b pb-4 last:border-b-0">
                              <Avatar className="h-10 w-10 opacity-50"><AvatarFallback>C</AvatarFallback></Avatar>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between items-center">
                                   <div className="h-4 bg-muted rounded w-1/3 animate-pulse"></div> {/* Name skeleton */}
                                   <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div> {/* Stars skeleton */}
                                </div>
                                <div className="h-3 bg-muted rounded w-1/5 animate-pulse mb-1.5"></div> {/* Date skeleton */}
                                <div className="h-4 bg-muted rounded w-full animate-pulse"></div> {/* Comment line 1 */}
                                <div className="h-4 bg-muted rounded w-5/6 animate-pulse"></div> {/* Comment line 2 */}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : reviews.length > 0 ? reviews.map(review => (
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
                                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                                    ))}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1.5">
                                    {formatDistanceToNowStrict(new Date(review.reviewDate), { addSuffix: true })}
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
                        <p className="text-muted-foreground">{provider.location}</p>
                         {provider.fullAddress && <p className="text-xs text-muted-foreground">{provider.fullAddress}</p>}
                    </div>
                  </div>
                   <div className="flex items-start">
                    <Briefcase className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                     <div>
                        <p className="font-medium">Main Service</p>
                         <div className="flex items-center text-muted-foreground">
                           <ServiceCategoryIcon category={provider.mainService} iconOnly className="h-4 w-4 mr-1.5"/>
                           {provider.mainService}
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
                  <Separator />
                   <Button onClick={handleRequestQuote} className="w-full bg-primary hover:bg-primary/90" disabled={isChatLoading || currentUser?.uid === provider.userId}>
                    {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                     {currentUser?.uid === provider.userId ? "This is Your Profile" : `Message ${provider.businessName.split(' ')[0]}`}
                  </Button>
                  {provider.contactPhoneNumber && (
                    <Button variant="outline" className="w-full" onClick={() => toast({title: "Call Information", description: `Phone: ${provider.contactPhoneNumber}. Revealed upon quote acceptance or direct contact.`})}>
                        <Phone className="mr-2 h-4 w-4" /> Call (Info)
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

    
