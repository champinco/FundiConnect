
import ProviderCard, { type Provider } from '@/components/provider-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Star, MapPin, Search as SearchIcon } from 'lucide-react';
import type { ServiceCategory } from '@/components/service-category-icon';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';

// Tier 1 services + Other for search filters
const tier1ServiceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
  'HVAC',
  'Solar Installation',
  'Painting & Decorating',
  'Carpentry & Furniture',
  'Landscaping',
  'Tiling & Masonry',
  'Pest Control',
  'Locksmith',
  'Other'
];

async function getAllProviders(): Promise<Provider[]> {
  try {
    const providersRef = collection(db, 'providerProfiles');
    const querySnapshot = await getDocs(providersRef);
    const providers: Provider[] = [];
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      // Make sure to cast to ProviderProfile or a compatible type that getDocs returns data as.
      // For stricter typing, you might need to define a converter for your Firestore collections.
      const data = doc.data() as ProviderProfile; 
      providers.push({
        id: doc.id,
        name: data.businessName,
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/600x400.png',
        rating: data.rating,
        reviewsCount: data.reviewsCount,
        location: data.location,
        mainService: data.mainService,
        isVerified: data.isVerified,
        verificationAuthority: data.verificationAuthority,
        bioSummary: data.bio ? (data.bio.substring(0, 150) + (data.bio.length > 150 ? '...' : '')) : 'No bio available.',
      });
    });
    return providers;
  } catch (error) {
    console.error("Error fetching all providers:", error);
    return []; // Return empty array on error
  }
}


export default async function SearchPage({ searchParams }: { searchParams?: { category?: string; location?: string; query?: string } }) {
  const categoryParam = searchParams?.category;
  const locationParam = searchParams?.location;
  const queryParam = searchParams?.query;

  // Fetch all providers initially. Filtering logic will be enhanced later.
  const allProviders = await getAllProviders();

  // Simple client-side filtering for initial display based on category (if present in URL)
  // More advanced filtering will be server-side or via a server action.
  const filteredProviders = categoryParam && categoryParam !== 'Other'
    ? allProviders.filter(provider => provider.mainService === categoryParam)
    : allProviders;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 p-6 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-headline font-bold mb-2">Find Service Providers</h1>
        <p className="text-muted-foreground mb-6">Search for skilled and verified Fundis for your specific needs.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="service-query">Service or Provider Name</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="service-query" placeholder="e.g., Electrician, John Doe" className="pl-10" defaultValue={queryParam || ''}/>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location-query">Location</Label>
             <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="location-query" placeholder="e.g., Nairobi, Kilimani" className="pl-10" defaultValue={locationParam || ''} />
            </div>
          </div>
          <Button className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90">
            <SearchIcon className="mr-2 h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-1/4 lg:w-1/5">
          <div className="p-6 bg-card rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5 text-primary" /> Filters
            </h2>
            
            <div>
              <h3 className="font-medium mb-2">Service Category</h3>
              <Select defaultValue={categoryParam || 'Other'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {tier1ServiceCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="font-medium mb-2">Rating</h3>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.5">4.5 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                  <SelectItem value="4">4 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                  <SelectItem value="3">3 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Verification</h3>
              <div className="flex items-center space-x-2">
                <Checkbox id="verified-only" />
                <Label htmlFor="verified-only">Verified Only</Label>
              </div>
            </div>

            <Button className="w-full bg-primary hover:bg-primary/90">Apply Filters</Button>
          </div>
        </aside>

        {/* Provider Listings */}
        <main className="w-full md:w-3/4 lg:w-4/5">
          {filteredProviders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-2xl font-semibold mb-4">No Providers Found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria or filters, or check back later as we grow our network!</p>
            </div>
          )}
          {/* Pagination (conceptual) */}
          {filteredProviders.length > 10 && ( // Show pagination if more than 10 results
            <div className="mt-12 flex justify-center">
              <Button variant="outline" className="mr-2">Previous</Button>
              <Button variant="outline">Next</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
