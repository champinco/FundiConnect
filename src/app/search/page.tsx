
"use client";

import { useState, useEffect, type FormEvent, useMemo, Suspense, useCallback } from 'react';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton';
import JobCard, { type JobCardProps } from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';

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
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { JobStatus } from '@/models/job';


const allServiceCategoriesList: (ServiceCategory | 'All')[] = [
  'All', 'Plumbing', 'Electrical', 'Appliance Repair', 'Garbage Collection', 'HVAC',
  'Solar Installation', 'Painting & Decorating', 'Carpentry & Furniture',
  'Landscaping', 'Tiling & Masonry', 'Pest Control', 'Locksmith', 'Other'
];

type SearchMode = 'providers' | 'jobs';

function SearchPageContent() {
  const router = useRouter();
  const nextSearchParams = useSearchParams(); 

  const memoizedNextSearchParams = useMemo(() => {
    return new URLSearchParams(nextSearchParams.toString());
  }, [nextSearchParams]);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const initialMode = (memoizedNextSearchParams.get('mode') as SearchMode) || 'providers';
  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);

  // Provider search state
  const [providerSearchQuery, setProviderSearchQuery] = useState(memoizedNextSearchParams.get('query') || '');
  const [providerLocationQuery, setProviderLocationQuery] = useState(memoizedNextSearchParams.get('location') || '');
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<ServiceCategory | 'All'>((memoizedNextSearchParams.get('category') as ServiceCategory | 'All') || 'All');
  const [minRating, setMinRating] = useState<number | null>(memoizedNextSearchParams.get('minRating') ? parseFloat(memoizedNextSearchParams.get('minRating')!) : null);
  const [verifiedOnly, setVerifiedOnly] = useState(memoizedNextSearchParams.get('verifiedOnly') === 'true');
  const [providerResults, setProviderResults] = useState<Provider[]>([]);

  // Job search state
  const [jobKeywordsQuery, setJobKeywordsQuery] = useState(memoizedNextSearchParams.get('keywords') || '');
  const [jobLocationQuery, setJobLocationQuery] = useState(memoizedNextSearchParams.get('jobLocation') || '');
  const [selectedJobCategory, setSelectedJobCategory] = useState<ServiceCategory | 'All'>((memoizedNextSearchParams.get('jobCategory') as ServiceCategory | 'All') || 'All');
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(memoizedNextSearchParams.get('status') || null);
  const [jobResults, setJobResults] = useState<JobCardProps['job'][]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);


  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);


  const executeSearch = useCallback(async () => {
    if (authLoading) return; 

    setIsLoading(true);
    setHasSearched(true); 

    const currentUrlParams = new URLSearchParams(window.location.search);
    const modeFromUrl = (currentUrlParams.get('mode') as SearchMode) || initialMode;


    if (modeFromUrl === 'providers') {
      const params: ProviderSearchParams = {
        query: currentUrlParams.get('query') || '',
        location: currentUrlParams.get('location') || '',
        category: (currentUrlParams.get('category') as ServiceCategory | 'All') === 'All' || !currentUrlParams.get('category') 
                    ? null 
                    : currentUrlParams.get('category') as ServiceCategory,
        minRating: currentUrlParams.get('minRating') ? parseFloat(currentUrlParams.get('minRating')!) : null,
        verifiedOnly: currentUrlParams.get('verifiedOnly') === 'true',
      };
      const providers = await searchProvidersAction(params);
      setProviderResults(providers);
    } else if (modeFromUrl === 'jobs') {
      const myJobsFlag = currentUrlParams.get('myJobs') === 'true';
      const statusParam = currentUrlParams.get('status') as JobStatus | 'all_my' | null;

      if (myJobsFlag && !currentUser && !authLoading) {
        // If 'myJobs' is requested but user isn't loaded (and auth check is done), show nothing or an auth message.
        setJobResults([]);
        setIsLoading(false);
        return;
      }

      const params: JobSearchParams = {
        keywords: currentUrlParams.get('keywords') || '',
        location: currentUrlParams.get('jobLocation') || '',
        category: (currentUrlParams.get('jobCategory') as ServiceCategory | 'All') === 'All' || !currentUrlParams.get('jobCategory')
                    ? null
                    : currentUrlParams.get('jobCategory') as ServiceCategory,
        isMyJobsSearch: myJobsFlag,
        currentUserId: myJobsFlag && currentUser ? currentUser.uid : null,
        filterByStatus: statusParam,
      };
      const jobs = await searchJobsAction(params);
      setJobResults(jobs);
    }
    setIsLoading(false);
  }, [authLoading, currentUser, initialMode]); // Removed searchMode and other local state from deps


  useEffect(() => {
    // This effect synchronizes component state from URL parameters when they change.
    // It also triggers the initial search if necessary.
    if (authLoading) return;

    const currentUrlParams = new URLSearchParams(window.location.search);
    const modeFromUrl = (currentUrlParams.get('mode') as SearchMode) || 'providers';
    
    setSearchMode(modeFromUrl); // Update visual tab selection

    if (modeFromUrl === 'providers') {
      setProviderSearchQuery(currentUrlParams.get('query') || '');
      setProviderLocationQuery(currentUrlParams.get('location') || '');
      setSelectedProviderCategory((currentUrlParams.get('category') as ServiceCategory | 'All') || 'All');
      setMinRating(currentUrlParams.get('minRating') ? parseFloat(currentUrlParams.get('minRating')!) : null);
      setVerifiedOnly(currentUrlParams.get('verifiedOnly') === 'true');
    } else { // jobs mode
      setJobKeywordsQuery(currentUrlParams.get('keywords') || '');
      setJobLocationQuery(currentUrlParams.get('jobLocation') || '');
      setSelectedJobCategory((currentUrlParams.get('jobCategory') as ServiceCategory | 'All') || 'All');
      setJobStatusFilter(currentUrlParams.get('status') || null);
    }

    // Determine if a search should be executed based on URL parameters
    let shouldExecuteInitialSearch = false;
    if (modeFromUrl === 'jobs') {
        // For jobs, especially "myJobs", always try to load if user context is available or not needed.
        if (currentUrlParams.get('myJobs') === 'true') {
            if (currentUser || !authLoading) { // If user is known, or auth check is complete
                shouldExecuteInitialSearch = true;
            }
        } else { // General job search
            shouldExecuteInitialSearch = true;
        }
    } else if (modeFromUrl === 'providers') {
        // For providers, execute if any search/filter param is present
        if (currentUrlParams.has('query') || currentUrlParams.has('location') || 
            (currentUrlParams.get('category') && currentUrlParams.get('category') !== 'All') || 
            currentUrlParams.has('minRating') || currentUrlParams.has('verifiedOnly')) {
            shouldExecuteInitialSearch = true;
        }
    }
    
    if(currentUrlParams.toString().length > 0 && currentUrlParams.get('mode')) { // if any params exist beyond just mode
        shouldExecuteInitialSearch = true;
    }


    if (shouldExecuteInitialSearch) {
      executeSearch();
    } else if (!isLoading) { // If no search is triggered and not already loading, clear results
      setProviderResults([]);
      setJobResults([]);
      setHasSearched(false); // Reset hasSearched if no params trigger a search
    }

  }, [memoizedNextSearchParams, authLoading, currentUser, executeSearch]);


  const updateUrlAndSearch = (newParams: Record<string, string | null>) => {
    const query = new URLSearchParams(window.location.search);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        query.delete(key);
      } else {
        query.set(key, value);
      }
    });
    
    // Ensure mode is always present
    if (!query.has('mode')) {
        query.set('mode', searchMode);
    }

    router.push(`/search?${query.toString()}`, { scroll: false });
    // The useEffect listening to memoizedNextSearchParams will trigger executeSearch
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const paramsToUpdate: Record<string, string | null> = { mode: searchMode };
    if (searchMode === 'providers') {
      paramsToUpdate.query = providerSearchQuery;
      paramsToUpdate.location = providerLocationQuery;
      // Category, rating, verifiedOnly are part of filter state, applied by handleApplyFilters
    } else { // jobs
      paramsToUpdate.keywords = jobKeywordsQuery;
      paramsToUpdate.jobLocation = jobLocationQuery;
      // Job category is part of filter state
    }
    updateUrlAndSearch(paramsToUpdate);
  };

  const handleApplyFilters = () => {
    const paramsToUpdate: Record<string, string | null> = { mode: searchMode };
    if (searchMode === 'providers') {
      paramsToUpdate.category = selectedProviderCategory === 'All' ? null : selectedProviderCategory;
      paramsToUpdate.minRating = minRating === null ? null : minRating.toString();
      paramsToUpdate.verifiedOnly = verifiedOnly ? 'true' : null;
      // Include search terms from input fields if they exist
      paramsToUpdate.query = providerSearchQuery;
      paramsToUpdate.location = providerLocationQuery;
    } else { // jobs
      paramsToUpdate.jobCategory = selectedJobCategory === 'All' ? null : selectedJobCategory;
      // Include search terms from input fields if they exist
      paramsToUpdate.keywords = jobKeywordsQuery;
      paramsToUpdate.jobLocation = jobLocationQuery;
      // Status filter is managed by URL, no need to set from jobStatusFilter state here if already in URL
    }
    updateUrlAndSearch(paramsToUpdate);
  };
  
  const handleModeChange = (newMode: SearchMode) => {
    // Update local state for UI consistency immediately
    setSearchMode(newMode);
    // Clear previous mode's results
    if (newMode === 'providers') setJobResults([]); else setProviderResults([]);
    setHasSearched(false); // Reset search status for the new mode

    const query = new URLSearchParams();
    query.set('mode', newMode);
    // Preserve myJobs if switching to jobs mode and it was already there
    if (newMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true') {
        query.set('myJobs', 'true');
        if (memoizedNextSearchParams.get('status')) {
            query.set('status', memoizedNextSearchParams.get('status')!);
        }
    }
    router.push(`/search?${query.toString()}`, { scroll: false });
    // The useEffect listening to memoizedNextSearchParams will handle state sync and execution
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

      <form onSubmit={handleFormSubmit} className="mb-8 p-6 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-headline font-bold mb-2">
          {searchMode === 'providers' ? 'Find Service Providers' : 
           (memoizedNextSearchParams.get('myJobs') === 'true' ? 'My Posted Jobs' : 'Discover Job Opportunities')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {searchMode === 'providers'
            ? 'Search for skilled and verified Fundis for your specific needs.'
            : (memoizedNextSearchParams.get('myJobs') === 'true' 
                ? 'Review and manage jobs you have posted.' 
                : 'Browse open jobs posted by clients and submit your quotes.')}
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
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading || authLoading}>
              {(isLoading || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
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
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading || authLoading}>
              {(isLoading || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
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

            <Button onClick={handleApplyFilters} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || authLoading}>
              {(isLoading || authLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </div>
        </aside>

        <main className="w-full md:w-3/4 lg:w-4/5">
          {(isLoading || (authLoading && memoizedNextSearchParams.get('myJobs') === 'true')) && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${searchMode === 'providers' ? 'xl:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              {[...Array(searchMode === 'providers' ? 6 : 4)].map((_, i) =>
                searchMode === 'providers'
                  ? <ProviderCardSkeleton key={i} />
                  : <JobCardSkeleton key={i} />
              )}
            </div>
          )}
          {!isLoading && !authLoading && hasSearched && searchMode === 'providers' && providerResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {providerResults.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
          {!isLoading && !authLoading && hasSearched && searchMode === 'jobs' && jobResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobResults.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
          {!isLoading && !authLoading && hasSearched && (
            (searchMode === 'providers' && providerResults.length === 0) ||
            (searchMode === 'jobs' && jobResults.length === 0 && !(memoizedNextSearchParams.get('myJobs') === 'true' && authLoading)) // Avoid showing "no results" for myJobs while auth is still loading
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
                {searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') !== 'true' && (
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria or check back later for new job postings.</p>
                )}
                {searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true' && (
                  <p className="text-sm text-muted-foreground">You haven&apos;t posted any jobs yet, or no jobs match the current filters. <Link href="/jobs/post" className="text-primary hover:underline">Post a new job</Link>.</p>
                )}
              </div>
            )}
          {!isLoading && !authLoading && !hasSearched && !(memoizedNextSearchParams.get('myJobs') === 'true' && authLoading) && ( 
            <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <SearchIcon className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">
                {searchMode === 'providers' ? 'Find Your Fundi' : 
                 (memoizedNextSearchParams.get('myJobs') === 'true' ? 'Your Posted Jobs' : 'Discover Job Opportunities')}
              </h3>
              <p className="text-muted-foreground">
                {searchMode === 'providers'
                  ? 'Enter your search criteria above to find available service providers.'
                  : (memoizedNextSearchParams.get('myJobs') === 'true' 
                      ? 'Your posted jobs will appear here. If this is your first time, try posting a job!' 
                      : 'Use the filters to discover relevant job postings, or see all open jobs.')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


export default function SearchPage() {
  const SuspenseFallback = (
    <div className="container mx-auto px-4 py-8">
      <div className="h-10 bg-muted rounded w-1/2 mx-auto mb-8 animate-pulse"></div> {/* Tabs Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8 p-6 bg-card rounded-lg shadow">
        <div className="space-y-1.5">
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse mb-1"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="space-y-1.5">
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse mb-1"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="h-10 bg-muted rounded animate-pulse"></div>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-1/4 lg:w-1/5">
          <div className="p-6 bg-card rounded-lg shadow space-y-6 sticky top-20">
            <div className="h-6 w-1/2 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-1/4 bg-muted rounded animate-pulse mb-1"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-1/4 bg-muted rounded animate-pulse mb-1"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
            <div className="h-6 w-1/2 bg-muted rounded animate-pulse"></div>
            <div className="h-10 bg-muted rounded animate-pulse"></div>
          </div>
        </aside>
        <main className="w-full md:w-3/4 lg:w-4/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <ProviderCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    </div>
  );

  return (
    <Suspense fallback={SuspenseFallback}>
      <SearchPageContent />
    </Suspense>
  );
}
