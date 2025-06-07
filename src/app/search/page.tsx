
import ProviderCard, { type Provider } from '@/components/provider-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Star, MapPin, Search as SearchIcon } from 'lucide-react';
import type { ServiceCategory } from '@/components/service-category-icon';

// Mock data - replace with actual data fetching
const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'Alpha Electrics Ltd.',
    profilePictureUrl: 'https://placehold.co/600x400.png',
    rating: 4.8,
    reviewsCount: 120,
    location: 'Nairobi CBD',
    mainService: 'Electrical',
    isVerified: true,
    verificationAuthority: 'EPRA',
    bioSummary: 'Top-rated electricians for all your needs. Fully certified and insured. Available 24/7 for emergencies.',
  },
  {
    id: '2',
    name: 'AquaFlow Plumbers',
    profilePictureUrl: 'https://placehold.co/600x400.png',
    rating: 4.5,
    reviewsCount: 85,
    location: 'Westlands, Nairobi',
    mainService: 'Plumbing',
    isVerified: true,
    verificationAuthority: 'NCA',
    bioSummary: 'Experienced plumbers for residential and commercial properties. We fix leaks, install pipes, and more.',
  },
  {
    id: '3',
    name: 'Appliance Wizards KE',
    profilePictureUrl: 'https://placehold.co/600x400.png',
    rating: 4.7,
    reviewsCount: 92,
    location: 'Kilimani, Nairobi',
    mainService: 'Appliance Repair',
    isVerified: true,
    verificationAuthority: 'NITA',
    bioSummary: 'Expert repair for fridges, washing machines, ovens, and more. Quick and reliable service.',
  },
  {
    id: '4',
    name: 'EcoClean Waste Management',
    profilePictureUrl: 'https://placehold.co/600x400.png',
    rating: 4.3,
    reviewsCount: 60,
    location: 'Industrial Area, Nairobi',
    mainService: 'Garbage Collection',
    isVerified: true,
    verificationAuthority: 'NEMA',
    bioSummary: 'Reliable and eco-friendly garbage collection services for homes and businesses.',
  },
   {
    id: '5',
    name: 'Solaris Green Energy',
    profilePictureUrl: 'https://placehold.co/600x400.png',
    rating: 4.9,
    reviewsCount: 150,
    location: 'Thika Road, Nairobi',
    mainService: 'Solar Installation',
    isVerified: true,
    verificationAuthority: 'EPRA',
    bioSummary: 'Go green with our expert solar panel installation services. Save on energy bills and help the environment.',
  },
];

// Tier 1 services + Other for search filters
const tier1ServiceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
  'Other'
];


export default function SearchPage({ searchParams }: { searchParams?: { category?: string; location?: string; query?: string } }) {
  const categoryParam = searchParams?.category;
  const locationParam = searchParams?.location;
  const queryParam = searchParams?.query;

  // In a real app, you'd fetch providers based on searchParams
  const filteredProviders = mockProviders.filter(provider => {
    let matches = true;
    if (categoryParam && provider.mainService !== categoryParam && categoryParam !== 'Other') {
      matches = false;
    }
    // Add more filtering logic for location and query if needed
    // Example: if (locationParam && !provider.location.toLowerCase().includes(locationParam.toLowerCase())) matches = false;
    // Example: if (queryParam && !provider.name.toLowerCase().includes(queryParam.toLowerCase()) && !provider.mainService.toLowerCase().includes(queryParam.toLowerCase()) ) matches = false;
    return matches;
  });

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
              <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
            </div>
          )}
          {/* Pagination (conceptual) */}
          {filteredProviders.length > 0 && (
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

    