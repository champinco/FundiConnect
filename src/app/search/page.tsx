
"use client";

import { useState, useEffect, type FormEvent, useMemo } from 'react';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton';
import JobCard, { type JobCardProps } from '@/components/job-card'; // Import JobCard
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton'; // Import JobCardSkeleton

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Star, MapPin, Search as SearchIcon, Loader2, Info, Briefcase, PackageOpen } from 'lucide-react';
import type { ServiceCategory } from '@/components/service-category-icon';
import { searchProvidersAction, type SearchParams as ProviderSearchParams, searchJobsAction, type JobSearchParams } from './actions'; 
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const allServiceCategoriesList: (ServiceCategory | 'All')[] = [
  'All', 'Plumbing', 'Electrical', 'Appliance Repair', 'Garbage Collection', 'HVAC', 
  'Solar Installation', 'Painting & Decorating', 'Carpentry & Furniture',
  'Landscaping', 'Tiling & Masonry', 'Pest Control', 'Locksmith', 'Other'
];

type SearchMode = 'providers' | 'jobs';

export default function SearchPage() {
  const nextSearchParams = useSearchParams();
  const router = useRouter();
  
  const [searchMode, setSearchMode] = useState<SearchMode>((nextSearchParams.get('mode') as SearchMode) || 'providers');

  // Provider search state
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerLocationQuery, setProviderLocationQuery] = useState('');
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<ServiceCategory | 'All'>('All');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [providerResults, setProviderResults] = useState<Provider[]>([]);

  // Job search state
  const [jobKeywordsQuery, setJobKeywordsQuery] = useState('');
  const [jobLocationQuery, setJobLocationQuery] = useState('');
  const [selectedJobCategory, setSelectedJobCategory] = useState<ServiceCategory | 'All'>('All');
  const [jobResults, setJobResults] = useState<JobCardProps['job'][]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Memoize search params to avoid re-running useEffect unnecessarily if only internal state changes
  const memoizedNextSearchParams = useMemo(() => {
    return new URLSearchParams(nextSearchParams.toString());
  }, [nextSearchParams]);


  const updateURLParams = (mode: SearchMode, params: ProviderSearchParams | JobSearchParams) => {
    const query = new URLSearchParams();
    query.set('mode', mode);

    if (mode === 'providers') {
      const pParams = params as ProviderSearchParams;
      if (pParams.query) query.set('query', pParams.query);
      if (pParams.location) query.set('location', pParams.location);
      if (pParams.category) query.set('category', pParams.category);
      if (pParams.minRating) query.set('minRating', pParams.minRating.toString());
      if (pParams.verifiedOnly) query.set('verifiedOnly', 'true');
    } else if (mode === 'jobs') {
      const jParams = params as JobSearchParams;
      if (jParams.keywords) query.set('keywords', jParams.keywords);
      if (jParams.location) query.set('jobLocation', jParams.location); // Use distinct param for job location
      if (jParams.category) query.set('jobCategory', jParams.category); // Use distinct param for job category
    }
    router.push(`/search?${query.toString()}`, { scroll: false });
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setIsLoading(true);
    setHasSearched(true); // Mark that a search attempt has been made

    if (searchMode === 'providers') {
      const params: ProviderSearchParams = {
        query: providerSearchQuery,
        location: providerLocationQuery,
        category: selectedProviderCategory === 'All' ? null : selectedProviderCategory,
        minRating: minRating,
        verifiedOnly: verifiedOnly,
      };
      updateURLParams('providers', params);
      const providers = await searchProvidersAction(params);
      setProviderResults(providers);
    } else if (searchMode === 'jobs') {
      const params: JobSearchParams = {
        keywords: jobKeywordsQuery,
        location: jobLocationQuery,
        category: selectedJobCategory === 'All' ? null : selectedJobCategory,
      };
      updateURLParams('jobs', params);
      const jobs = await searchJobsAction(params);
      setJobResults(jobs);
    }
    setIsLoading(false);
  };
  
  // Effect to initialize state from URL and perform initial search
  useEffect(() => {
    const currentMode = (memoizedNextSearchParams.get('mode') as SearchMode) || 'providers';
    setSearchMode(currentMode);
    setHasSearched(false); // Reset hasSearched on mode change or param change
    setProviderResults([]);
    setJobResults([]);

    let performInitialSearch = false;

    if (currentMode === 'providers') {
      const queryParam = memoizedNextSearchParams.get('query') || '';
      const locationParam = memoizedNextSearchParams.get('location') || '';
      const categoryParam = (memoizedNextSearchParams.get('category') as ServiceCategory | 'All') || 'All';
      const ratingParam = memoizedNextSearchParams.get('minRating') ? parseFloat(memoizedNextSearchParams.get('minRating')!) : null;
      const verifiedParam = memoizedNextSearchParams.get('verifiedOnly') === 'true';

      setProviderSearchQuery(queryParam);
      setProviderLocationQuery(locationParam);
      setSelectedProviderCategory(categoryParam);
      setMinRating(ratingParam);
      setVerifiedOnly(verifiedParam);
      if (queryParam || locationParam || categoryParam !== 'All' || ratingParam !== null || verifiedParam) {
        performInitialSearch = true;
      }
    } else if (currentMode === 'jobs') {
      const keywordsParam = memoizedNextSearchParams.get('keywords') || '';
      const jobLocationParam = memoizedNextSearchParams.get('jobLocation') || '';
      const jobCategoryParam = (memoizedNextSearchParams.get('jobCategory') as ServiceCategory | 'All') || 'All';

      setJobKeywordsQuery(keywordsParam);
      setJobLocationQuery(jobLocationParam);
      setSelectedJobCategory(jobCategoryParam);
       if (keywordsParam || jobLocationParam || jobCategoryParam !== 'All') {
        performInitialSearch = true;
      }
    }

    if (performInitialSearch) {
      handleSearch(); // Call handleSearch which will set isLoading and hasSearched
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedNextSearchParams]); // Depend on memoizedNextSearchParams

  const handleModeChange = (newMode: SearchMode) => {
    setSearchMode(newMode);
    setHasSearched(false); // Reset search status
    setProviderResults([]); // Clear previous results
    setJobResults([]);     // Clear previous results
    // Update URL to reflect new mode, keeping other relevant params if desired or clearing them
    const params = new URLSearchParams(memoizedNextSearchParams);
    params.set('mode', newMode);
    // Optionally clear params from other mode
    // if (newMode === 'providers') { params.delete('keywords'); params.delete('jobLocation'); params.delete('jobCategory'); }
    // else { params.delete('query'); params.delete('location'); params.delete('category'); params.delete('minRating'); params.delete('verifiedOnly'); }
    router.push(`/search?${params.toString()}`, { scroll: false });
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={searchMode} onValueChange={(value) => handleModeChange(value as SearchMode)} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto">
          <TabsTrigger value="providers" className="text-base py-2.5">
            <SearchIcon className="mr-2 h-5 w-5" /> Find Fundis
          </TabsTrigger>
          <TabsTrigger value="jobs" className="text-base py-2.5">
            <Briefcase className="mr-2 h-5 w-5" /> Find Jobs
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSearch} className="mb-8 p-6 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-headline font-bold mb-2">
          {searchMode === 'providers' ? 'Find Service Providers' : 'Discover Job Opportunities'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {searchMode === 'providers' 
            ? 'Search for skilled and verified Fundis for your specific needs.'
            : 'Browse open jobs posted by clients and submit your quotes.'}
        </p>
        
        {searchMode === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="provider-service-query">Service or Provider Name</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="provider-service-query" 
                  placeholder="e.g., Electrician, Juma's Services" 
                  className="pl-10" 
                  value={providerSearchQuery}
                  onChange={(e) => setProviderSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider-location-query">Provider Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="provider-location-query" 
                  placeholder="e.g., Nairobi, Kilimani" 
                  className="pl-10" 
                  value={providerLocationQuery}
                  onChange={(e) => setProviderLocationQuery(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
              Search Providers
            </Button>
          </div>
        )}

        {searchMode === 'jobs' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="job-keywords-query">Keywords (Title/Description)</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="job-keywords-query" 
                  placeholder="e.g., Leaking tap, wiring" 
                  className="pl-10" 
                  value={jobKeywordsQuery}
                  onChange={(e) => setJobKeywordsQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-location-query">Job Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="job-location-query" 
                  placeholder="e.g., Westlands, Mombasa" 
                  className="pl-10" 
                  value={jobLocationQuery}
                  onChange={(e) => setJobLocationQuery(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
              Search Jobs
            </Button>
          </div>
        )}
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
                value={searchMode === 'providers' ? selectedProviderCategory : selectedJobCategory}
                onValueChange={(value) => {
                  if (searchMode === 'providers') setSelectedProviderCategory(value as ServiceCategory | 'All');
                  else setSelectedJobCategory(value as ServiceCategory | 'All');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allServiceCategoriesList.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {searchMode === 'providers' && (
              <>
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
              </>
            )}
            
            {/* Placeholder for job-specific filters e.g. Posted Date */}
            {/* {searchMode === 'jobs' && ( ... )} */}

            <Button onClick={() => handleSearch()} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </div>
        </aside>

        <main className="w-full md:w-3/4 lg:w-4/5">
          {isLoading && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${searchMode === 'providers' ? 'xl:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              {[...Array(searchMode === 'providers' ? 6 : 4)].map((_, i) => 
                searchMode === 'providers' 
                  ? <ProviderCardSkeleton key={i} /> 
                  : <JobCardSkeleton key={i} />
              )}
            </div>
          )}
          {!isLoading && hasSearched && searchMode === 'providers' && providerResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {providerResults.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
          {!isLoading && hasSearched && searchMode === 'jobs' && jobResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobResults.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
          {!isLoading && hasSearched && (
            (searchMode === 'providers' && providerResults.length === 0) ||
            (searchMode === 'jobs' && jobResults.length === 0)
          ) && (
            <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <PackageOpen className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">
                No {searchMode === 'providers' ? 'Providers' : 'Jobs'} Found
              </h3>
              <p className="text-muted-foreground mb-4">
                We couldn&apos;t find any {searchMode === 'providers' ? 'providers' : 'jobs'} matching your current filters.
              </p>
              {searchMode === 'providers' && (
                 <p className="text-sm text-muted-foreground">Try adjusting your search criteria or <Link href="/jobs/post" className="text-primary hover:underline">post a job</Link> to get quotes.</p>
              )}
              {searchMode === 'jobs' && (
                 <p className="text-sm text-muted-foreground">Try adjusting your search criteria or check back later for new job postings.</p>
              )}
            </div>
          )}
          {!isLoading && !hasSearched && (
             <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <SearchIcon className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">
                {searchMode === 'providers' ? 'Find Your Fundi' : 'Discover Job Opportunities'}
              </h3>
              <p className="text-muted-foreground">
                {searchMode === 'providers' 
                  ? 'Enter your search criteria above to find available service providers.'
                  : 'Use the filters to discover relevant job postings.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

