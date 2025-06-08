
"use client"; // Required for hooks like useRouter, useState, useEffect

import Image from 'next/image';
import { useRouter } from 'next/navigation'; // For navigation
import { useEffect, useState } from 'react'; // For state and effects
import { Star, MapPin, CheckCircle2, Briefcase, MessageSquare, Phone, Upload, Loader2 } from 'lucide-react';
import VerifiedBadge from '@/components/verified-badge';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast"; // For showing notifications

import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'; // For auth state
import { auth } from '@/lib/firebase'; // Firebase auth instance
import { getOrCreateChat } from '@/services/chatService'; // Chat service
import type { ProviderProfile } from '@/models/provider'; // Provider model
import { getProviderProfileFromFirestore } from '@/services/providerService'; // Service to fetch provider


// Mock data for fallback - replace with actual data fetching for a specific provider by ID
const mockProviderFallback: ProviderProfile = {
  id: '1',
  userId: 'mockUserId',
  name: 'John Doe Electrics',
  businessName: 'John Doe Electrics',
  profilePictureUrl: 'https://placehold.co/800x600.png',
  bannerImageUrl: 'https://placehold.co/1200x400.png',
  rating: 4.8,
  reviewsCount: 120,
  location: 'Nairobi CBD, Reliable Towers, 5th Floor',
  mainService: 'Electrical' as ServiceCategory,
  specialties: ['Residential Wiring', 'Commercial Installations', 'Appliance Repair', 'Fault Finding'],
  yearsOfExperience: 10,
  bio: "Highly skilled and certified electrician with over 10 years of dedicated experience...",
  isVerified: true,
  verificationAuthority: 'EPRA',
  certifications: [
    { name: 'EPRA License C1', number: 'EPRA/ELC/12345' },
    { name: 'NCA Certified Technician', number: 'NCA/T/67890' },
  ],
  portfolio: [
    { id: 'p1', imageUrl: 'https://placehold.co/600x400.png', description: 'Complete office lighting setup', dataAiHint: 'office lighting' },
    { id: 'p2', imageUrl: 'https://placehold.co/600x400.png', description: 'Residential solar panel installation', dataAiHint: 'solar panels' },
  ],
  contactPhoneNumber: '+254 7XX XXX XXX',
  operatingHours: "Mon-Fri 9am-5pm",
  serviceAreas: ["Nairobi CBD", "Westlands"],
  createdAt: new Date(),
  updatedAt: new Date(),
};


export default function ProviderProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const providerId = params.id;

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      getProviderProfileFromFirestore(providerId)
        .then((profile) => {
          if (profile) {
            setProvider(profile);
          } else {
            // Provider not found, use mock or show error
            // setProvider(mockProviderFallback); // Or redirect / show not found
            toast({ title: "Error", description: "Provider profile not found.", variant: "destructive" });
            // router.push('/search'); // Optionally redirect
          }
        })
        .catch(error => {
          console.error("Error fetching provider profile:", error);
          toast({ title: "Error", description: "Could not load provider profile.", variant: "destructive" });
          // setProvider(mockProviderFallback); // Fallback
        })
        .finally(() => setIsLoading(false));
    }
  }, [providerId, toast, router]);

  const handleRequestQuote = async () => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please login to contact providers.", variant: "destructive" });
      router.push(`/auth/login?redirect=/providers/${providerId}`);
      return;
    }
    if (!provider) return;

    setIsChatLoading(true);
    try {
      const chatId = await getOrCreateChat(currentUser.uid, provider.userId); // provider.userId should be the Fundi's UID
      router.push(`/messages/${chatId}`);
    } catch (error: any) {
      console.error("Error creating or getting chat:", error);
      toast({ title: "Error", description: error.message || "Could not start conversation.", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading provider profile...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
            <CardHeader><CardTitle>Provider Not Found</CardTitle></CardHeader>
            <CardContent><p>The provider profile you are looking for does not exist or could not be loaded.</p>
            <Button asChild className="mt-4"><Link href="/search">Back to Search</Link></Button>
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-0">
          <div className="relative h-64 md:h-80 w-full">
            <Image
              src={provider.bannerImageUrl || provider.profilePictureUrl || 'https://placehold.co/1200x400.png'}
              alt={`${provider.businessName} cover image`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              data-ai-hint="workshop tools"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 md:p-8">
                <div className="flex items-start md:items-center space-x-4">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-lg overflow-hidden shrink-0">
                        <Image src={provider.profilePictureUrl || 'https://placehold.co/300x300.png'} alt={provider.businessName} fill style={{ objectFit: 'cover' }} data-ai-hint="professional portrait"/>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-white shadow-text">{provider.businessName}</h1>
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
                  <TabsTrigger value="reviews">Reviews (Coming Soon)</TabsTrigger>
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
                      <div>
                        <h4 className="font-semibold mb-1">Years of Experience:</h4>
                        <p>{provider.yearsOfExperience} years</p>
                      </div>
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
                            <div key={item.id} className="rounded-lg overflow-hidden shadow group aspect-video relative">
                              <Image src={item.imageUrl} alt={item.description} fill style={{objectFit: 'cover'}} className="transition-transform duration-300 group-hover:scale-105" data-ai-hint={item.dataAiHint || 'project image'}/>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                                <p className="text-sm text-white truncate">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No portfolio items uploaded yet.</p>
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
                      {/* Mock or actual reviews would go here */}
                       <p className="text-muted-foreground">Client reviews will be shown here once available.</p>
                      {/* {mockProviderFallback.reviews.map(review => (
                        <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{review.clientName}</h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{new Date(review.date).toLocaleDateString()}</p>
                          <p className="text-foreground/90">{review.comment}</p>
                        </div>
                      ))}
                      {mockProviderFallback.reviews.length === 0 && <p>No reviews yet.</p>} */}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Contact & Location</CardTitle>
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
                   <Button onClick={handleRequestQuote} className="w-full bg-primary hover:bg-primary/90" disabled={isChatLoading}>
                    {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                     Message {provider.businessName.split(' ')[0]}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => toast({title: "Feature Coming Soon", description: "Direct calling will be enabled after quote acceptance."})}>
                    <Phone className="mr-2 h-4 w-4" /> Call Now (Revealed after quote)
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Post a Job for {provider.businessName.split(' ')[0]}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">Need specific work done by this provider? Describe your job.</p>
                    <textarea className="w-full p-2 border rounded-md min-h-[80px] mb-3 bg-input" placeholder="Describe the work needed..."></textarea>
                    <Button variant="outline" className="w-full mb-3" onClick={() => toast({title: "Feature Coming Soon"})}>
                        <Upload className="mr-2 h-4 w-4" /> Upload Photos/Videos
                    </Button>
                    <Button className="w-full bg-accent hover:bg-accent/90" onClick={() => toast({title: "Feature Coming Soon"})}>Send Direct Job Request</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper for Clock icon if not already imported
import { Clock } from 'lucide-react';
