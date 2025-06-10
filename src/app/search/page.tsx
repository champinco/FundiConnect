
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Star, MapPin, Search as SearchIcon, Loader2, Info, PackageOpen } from 'lucide-react'; // Added PackageOpen
import type { ServiceCategory } from '@/components/service-category-icon';
import { searchProvidersAction, type SearchParams } from './actions'; 
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const tier1ServiceCategories: (ServiceCategory | 'All')[] = [
  'All', 'Plumbing', 'Electrical', 'Appliance Repair', 'Garbage Collection', 'HVAC', 
  'Solar Installation', 'Painting & Decorating', 'Carpentry & Furniture',
  'Landscaping', 'Tiling & Masonry', 'Pest Control', 'Locksmith', 'Other'
];

export default function SearchPage() {
  const nextSearchParams = useSearchParams();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState(nextSearchParams.get('query') || '');
  const [locationQuery, setLocationQuery] = useState(nextSearchParams.get('location') || '');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'All'>(
    (nextSearchParams.get('category') as ServiceCategory | 'All') || 'All'
  );
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(nextSearchParams.get('verifiedOnly') === 'true' || false);
  
  const [results, setResults] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const updateURLParams = (params: SearchParams) => {
    const query = new URLSearchParams();
    if (params.query) query.set('query', params.query);
    if (params.location) query.set('location', params.location);
    if (params.category) query.set('category', params.category);
    if (params.minRating) query.set('minRating', params.minRating.toString());
    if (params.verifiedOnly) query.set('verifiedOnly', 'true');
    router.push(`/search?${query.toString()}`, { scroll: false });
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setIsLoading(true);
    
    const params: SearchParams = {
      query: searchQuery,
      location: locationQuery,
      category: selectedCategory === 'All' ? null : selectedCategory,
      minRating: minRating,
      verifiedOnly: verifiedOnly,
    };
    
    updateURLParams(params); // Update URL as search is performed
    const providers = await searchProvidersAction(params);
    setResults(providers);
    setHasSearched(true);
    setIsLoading(false);
  };

  useEffect(() => {
    // Initialize state from URL params on component mount
    setSearchQuery(nextSearchParams.get('query') || '');
    setLocationQuery(nextSearchParams.get('location') || '');
    setSelectedCategory((nextSearchParams.get('category') as ServiceCategory | 'All') || 'All');
    setMinRating(nextSearchParams.get('minRating') ? parseFloat(nextSearchParams.get('minRating')!) : null);
    setVerifiedOnly(nextSearchParams.get('verifiedOnly') === 'true');

    // Perform initial search if any relevant query params are present
    if (nextSearchParams.get('query') || nextSearchParams.get('category') || nextSearchParams.get('location') || nextSearchParams.get('minRating') || nextSearchParams.get('verifiedOnly')) {
      // Construct params from URL for initial search
      const initialParams: SearchParams = {
        query: nextSearchParams.get('query'),
        location: nextSearchParams.get('location'),
        category: (nextSearchParams.get('category') as ServiceCategory | 'All') || null,
        minRating: nextSearchParams.get('minRating') ? parseFloat(nextSearchParams.get('minRating')!) : null,
        verifiedOnly: nextSearchParams.get('verifiedOnly') === 'true',
      };
       // Debounce or directly call search if params are present
      const performInitialSearch = async () => {
        setIsLoading(true);
        const providers = await searchProvidersAction(initialParams);
        setResults(providers);
        setHasSearched(true);
        setIsLoading(false);
      }
      performInitialSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSearchParams]); // Rerun when searchParams object itself changes

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSearch} className="mb-8 p-6 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-headline font-bold mb-2">Find Service Providers</h1>
        <p className="text-muted-foreground mb-6">Search for skilled and verified Fundis for your specific needs.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="service-query">Service or Provider Name</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="service-query" 
                placeholder="e.g., Electrician, Juma's Services" 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location-query">Location</Label>
             <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="location-query" 
                placeholder="e.g., Nairobi, Kilimani" 
                className="pl-10" 
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </form>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-1/4 lg:w-1/5">
          <div className="p-6 bg-card rounded-lg shadow space-y-6 sticky top-20">
            <h2 className="text-xl font-semibold flex items-center">
              <Filter className="mr-2 h-5 w-5 text-primary" /> Filters
            </h2>
            
            <div>
              <h3 className="font-medium mb-2 text-sm">Service Category</h3>
              <Select 
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as ServiceCategory | 'All')}
              >
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
              <h3 className="font-medium mb-2 text-sm">Minimum Rating</h3>
              <Select
                value={minRating?.toString() || "0"}
                onValueChange={(value) => setMinRating(value === "0" ? null : parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                  <SelectItem value="4">4 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                  <SelectItem value="3">3 <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" /> & Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 text-sm">Verification</h3>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="verified-only" 
                  checked={verifiedOnly}
                  onCheckedChange={(checked) => setVerifiedOnly(checked as boolean)}
                />
                <Label htmlFor="verified-only" className="text-sm">Verified Fundis Only</Label>
              </div>
            </div>

            <Button onClick={() => handleSearch()} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </div>
        </aside>

        <main className="w-full md:w-3/4 lg:w-4/5">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          ) : hasSearched && results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <PackageOpen className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">No Providers Found</h3>
              <p className="text-muted-foreground mb-4">We couldn't find any providers matching your current filters.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria or <Link href="/jobs/post" className="text-primary hover:underline">post a job</Link> to get quotes.</p>
            </div>
          ) : !hasSearched ? (
             <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <SearchIcon className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Find Your Fundi</h3>
              <p className="text-muted-foreground">Enter your search criteria above to find available service providers.</p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

    