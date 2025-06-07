import Image from 'next/image';
import { Star, MapPin, CheckCircle2, Briefcase, MessageSquare, Phone, Upload } from 'lucide-react';
import VerifiedBadge from '@/components/verified-badge';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

// Mock data - replace with actual data fetching for a specific provider by ID
const mockProvider = {
  id: '1',
  name: 'John Doe Electrics',
  profilePictureUrl: 'https://placehold.co/800x600.png',
  rating: 4.8,
  reviewsCount: 120,
  location: 'Nairobi CBD, Reliable Towers, 5th Floor',
  mainService: 'Electrical' as ServiceCategory,
  specialties: ['Residential Wiring', 'Commercial Installations', 'Appliance Repair', 'Fault Finding'],
  yearsOfExperience: 10,
  bio: "Highly skilled and certified electrician with over 10 years of dedicated experience in providing comprehensive electrical services for residential, commercial, and industrial clients. Specializing in electrical installations, maintenance, and troubleshooting, I am committed to delivering safe, reliable, and efficient solutions. I hold EPRA certification and prioritize customer satisfaction and safety above all. Available for emergency call-outs.",
  isVerified: true,
  verificationAuthority: 'EPRA',
  certifications: [
    { name: 'EPRA License C1', number: 'EPRA/ELC/12345' },
    { name: 'NCA Certified Technician', number: 'NCA/T/67890' },
  ],
  portfolio: [
    { id: 'p1', imageUrl: 'https://placehold.co/600x400.png', description: 'Complete office lighting setup', dataAiHint: 'office lighting' },
    { id: 'p2', imageUrl: 'https://placehold.co/600x400.png', description: 'Residential solar panel installation', dataAiHint: 'solar panels' },
    { id: 'p3', imageUrl: 'https://placehold.co/600x400.png', description: 'Industrial generator maintenance', dataAiHint: 'generator' },
    { id: 'p4', imageUrl: 'https://placehold.co/600x400.png', description: 'Home rewiring project', dataAiHint: 'electrical wiring' },
  ],
  reviews: [
    { id: 'r1', clientName: 'Alice W.', rating: 5, comment: 'John was very professional and fixed my issue quickly. Highly recommend!', date: '2024-07-15' },
    { id: 'r2', clientName: 'Bob K.', rating: 4, comment: 'Good service, though arrived a bit late. Work was well done.', date: '2024-06-20' },
    { id: 'r3', clientName: 'Charles M.', rating: 5, comment: 'Excellent electrician, very knowledgeable and fair pricing.', date: '2024-05-01' },
  ],
  phoneNumber: '+254 7XX XXX XXX' // Revealed after "Accept & Exchange Contacts"
};

export default function ProviderProfilePage({ params }: { params: { id: string } }) {
  // In a real app, fetch provider data using params.id
  const provider = mockProvider;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-0">
          <div className="relative h-64 md:h-80 w-full">
            <Image
              src={provider.profilePictureUrl}
              alt={`${provider.name} cover image`}
              fill
              style={{ objectFit: 'cover' }}
              priority
              data-ai-hint="workshop tools"
            />
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-6 md:p-8">
                <div className="flex items-start md:items-center space-x-4">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-md overflow-hidden">
                        <Image src={provider.profilePictureUrl} alt={provider.name} fill style={{ objectFit: 'cover' }} data-ai-hint="professional portrait"/>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline text-white ">{provider.name}</h1>
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
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="about">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">About {provider.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-foreground/90">
                      <p>{provider.bio}</p>
                      <div>
                        <h4 className="font-semibold mb-1">Specialties:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {provider.specialties.map(spec => <li key={spec}>{spec}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Years of Experience:</h4>
                        <p>{provider.yearsOfExperience} years</p>
                      </div>
                       <div>
                        <h4 className="font-semibold mb-1">Certifications:</h4>
                        <ul className="space-y-1">
                          {provider.certifications.map(cert => (
                            <li key={cert.name} className="flex items-center">
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> 
                              {cert.name} ({cert.number})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="portfolio">
                   <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Portfolio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {provider.portfolio.map(item => (
                          <div key={item.id} className="rounded-lg overflow-hidden shadow group">
                            <Image src={item.imageUrl} alt={item.description} width={600} height={400} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={item.dataAiHint}/>
                            <p className="p-3 text-sm bg-card">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="reviews">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Client Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {provider.reviews.map(review => (
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
                      {provider.reviews.length === 0 && <p>No reviews yet.</p>}
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
                    </div>
                  </div>
                   <div className="flex items-start">
                    <Briefcase className="h-5 w-5 mr-3 mt-1 text-primary shrink-0" />
                     <div>
                        <p className="font-medium">Main Service</p>
                        <p className="text-muted-foreground">{provider.mainService}</p>
                    </div>
                  </div>
                  <Separator />
                   <Button className="w-full bg-primary hover:bg-primary/90">
                    <MessageSquare className="mr-2 h-4 w-4" /> Request Quote
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" /> Call Now (Revealed after quote)
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Post a Job for {provider.name.split(' ')[0]}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">Need specific work done by this provider? Describe your job.</p>
                    <textarea className="w-full p-2 border rounded-md min-h-[80px] mb-3" placeholder="Describe the work needed..."></textarea>
                    <Button variant="outline" className="w-full mb-3">
                        <Upload className="mr-2 h-4 w-4" /> Upload Photos/Videos
                    </Button>
                    <Button className="w-full bg-accent hover:bg-accent/90">Send Direct Job Request</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
