
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton'; // New Import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, Star, MapPin, Search as SearchIcon, Loader2, Info } from 'lucide-react';
import type { ServiceCategory } from '@/components/service-category-icon';
import { searchProvidersAction, type SearchParams } from './actions'; 
import { useSearchParams } from 'next/navigation';

const tier1ServiceCategories: (ServiceCategory | 'All')[] = [
  'All', 'Plumbing', 'Electrical', 'Appliance Repair', 'Garbage Collection', 'HVAC', 
  'Solar Installation', 'Painting & Decorating', 'Carpentry & Furniture',
  'Landscaping', 'Tiling & Masonry', 'Pest Control', 'Locksmith', 'Other'
];

export default function SearchPage() {
  const nextSearchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(nextSearchParams.get('query') || '');
  const [locationQuery, setLocationQuery] = useState(nextSearchParams.get('location') || '');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'All'>(
    (nextSearchParams.get('category') as ServiceCategory | 'All') || 'All'
  );
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  const [results, setResults] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // To know if a search has been attempted

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
    
    const providers = await searchProvidersAction(params);
    setResults(providers);
    setHasSearched(true); // Mark that a search has been made
    setIsLoading(false);
  };

  // Perform initial search if query params are present
  useEffect(() => {
    if (nextSearchParams.get('query') || nextSearchParams.get('category') || nextSearchParams.get('location')) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

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
                placeholder="e.g., Electrician, John Doe" 
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
        {/* Filters Sidebar */}
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

        {/* Provider Listings */}
        <main className="w-full md:w-3/4 lg:w-4/5">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          ) : hasSearched && results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg shadow">
              <Info className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">No Providers Found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
            </div>
          ) : !hasSearched ? (
             <div className="text-center py-12 bg-card rounded-lg shadow">
              <SearchIcon className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Find Your Fundi</h3>
              <p className="text-muted-foreground">Enter your search criteria above to find available service providers.</p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
