
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

  const [searchMode, setSearchMode] = useState<SearchMode>('providers');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerLocationQuery, setProviderLocationQuery] = useState('');
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<ServiceCategory | 'All'>('All');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  const [jobKeywordsQuery, setJobKeywordsQuery] = useState('');
  const [jobLocationQuery, setJobLocationQuery] = useState('');
  const [selectedJobCategory, setSelectedJobCategory] = useState<ServiceCategory | 'All'>('All');
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null); 

  const [providerResults, setProviderResults] = useState<Provider[]>([]);
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

  const executeSearch = useCallback(async (executionMode: SearchMode) => {
    if (authLoading && executionMode === 'jobs' && new URLSearchParams(window.location.search).get('myJobs') === 'true') {
      // This check might be redundant if the calling useEffect already handles it, but can be a safeguard.
      // Ensure setIsLoading(true) is called before returning if we want the UI to show loading.
      // However, the main effect already sets isLoading for this case.
      return;
    }
    setIsLoading(true);
    setHasSearched(true);

    if (executionMode === 'providers') {
      const params: ProviderSearchParams = {
        query: providerSearchQuery,
        location: providerLocationQuery,
        category: selectedProviderCategory === 'All' ? null : selectedProviderCategory,
        minRating: minRating,
        verifiedOnly: verifiedOnly,
      };
      try {
        const providers = await searchProvidersAction(params);
        setProviderResults(providers);
      } catch (error) {
        console.error("Error searching providers:", error);
        setProviderResults([]);
      }
    } else if (executionMode === 'jobs') {
      const myJobsFlag = new URLSearchParams(window.location.search).get('myJobs') === 'true';
      const statusParamFromUrl = new URLSearchParams(window.location.search).get('status') as JobStatus | 'all_my' | null;
      
      if (myJobsFlag && !currentUser && !authLoading) { 
        setJobResults([]); setIsLoading(false); return;
      }
      
      const params: JobSearchParams = {
        keywords: jobKeywordsQuery,
        location: jobLocationQuery,
        category: selectedJobCategory === 'All' ? null : selectedJobCategory,
        isMyJobsSearch: myJobsFlag,
        currentUserId: myJobsFlag && currentUser ? currentUser.uid : null,
        filterByStatus: statusParamFromUrl,
      };
      try {
        const jobs = await searchJobsAction(params);
        setJobResults(jobs);
      } catch (error) {
        console.error("Error searching jobs:", error);
        setJobResults([]);
      }
    }
    setIsLoading(false);
  }, [
    authLoading, currentUser, 
    providerSearchQuery, providerLocationQuery, selectedProviderCategory, minRating, verifiedOnly,
    jobKeywordsQuery, jobLocationQuery, selectedJobCategory,
    // setIsLoading, setHasSearched, setProviderResults, setJobResults are stable setters from useState
  ]);


  useEffect(() => {
    const currentUrlParams = new URLSearchParams(memoizedNextSearchParams.toString());
    const myJobsActive = currentUrlParams.get('myJobs') === 'true';
    const modeFromUrl = (currentUrlParams.get('mode') as SearchMode) || (myJobsActive ? 'jobs' : 'providers');

    if (authLoading && myJobsActive && modeFromUrl === 'jobs') {
      setIsLoading(true); 
      return;
    }
    
    setSearchMode(modeFromUrl); 

    if (modeFromUrl === 'providers') {
      setProviderSearchQuery(currentUrlParams.get('query') || '');
      setProviderLocationQuery(currentUrlParams.get('location') || '');
      setSelectedProviderCategory((currentUrlParams.get('category') as ServiceCategory | 'All') || 'All');
      setMinRating(currentUrlParams.get('minRating') ? parseFloat(currentUrlParams.get('minRating')!) : null);
      setVerifiedOnly(currentUrlParams.get('verifiedOnly') === 'true');
    } else { 
      setJobKeywordsQuery(currentUrlParams.get('keywords') || '');
      setJobLocationQuery(currentUrlParams.get('jobLocation') || '');
      setSelectedJobCategory((currentUrlParams.get('jobCategory') as ServiceCategory | 'All') || 'All');
      setJobStatusFilter(currentUrlParams.get('status') || null);
    }
    
    let performSearchNow = false;
    if (modeFromUrl === 'jobs') {
      if (myJobsActive) { // For "My Jobs"
        if (currentUser || !authLoading) { performSearchNow = true; } // Search if user is known or auth is done
      } else { // For general "Find Jobs"
         // Search if specific filters are applied or if it's a general browse
        if (currentUrlParams.has('keywords') || currentUrlParams.has('jobLocation') || (currentUrlParams.get('jobCategory') && currentUrlParams.get('jobCategory') !== 'All')) {
            performSearchNow = true;
        } else if (!currentUrlParams.has('keywords') && !currentUrlParams.has('jobLocation') && (!currentUrlParams.get('jobCategory') || currentUrlParams.get('jobCategory') === 'All')) {
            // Default: show all open jobs if no specific filters are set for general job search
            performSearchNow = true;
        }
      }
    } else if (modeFromUrl === 'providers') {
      if (currentUrlParams.has('query') || currentUrlParams.has('location') ||
          (currentUrlParams.get('category') && currentUrlParams.get('category') !== 'All') ||
          currentUrlParams.has('minRating') || currentUrlParams.has('verifiedOnly')) {
        performSearchNow = true;
      }
    }
    
    if (performSearchNow) {
      executeSearch(modeFromUrl); 
    } else {
      if (!isLoading) { 
          setProviderResults([]);
          setJobResults([]);
          setHasSearched(false); 
      }
    }
  }, [memoizedNextSearchParams, authLoading, currentUser, executeSearch, isLoading]);
  // Keep isLoading here for now to manage the "clear results" logic correctly when not performing a search.
  // And executeSearch is needed because its reference *can* change if its own dependencies change (which are set by this effect).
  // This structure is common: effect syncs URL to state, those state changes make executeSearch's ref stable for *that* render,
  // then executeSearch is called. If executeSearch was not a dep, we might call a stale closure.
  // The key is that executeSearch itself doesn't cause a loop with its *own* state setting.

  const updateUrlAndSearch = (newParams: Record<string, string | null>) => {
    const query = new URLSearchParams(window.location.search);
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'minRating' && value === "0")) {
        query.delete(key);
      } else {
        query.set(key, value);
      }
    });
    
    if (!query.has('mode')) {
        query.set('mode', searchMode); 
    }

    router.push(`/search?${query.toString()}`, { scroll: false });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const paramsToUpdate: Record<string, string | null> = { mode: searchMode };
    if (searchMode === 'providers') {
      paramsToUpdate.query = providerSearchQuery;
      paramsToUpdate.location = providerLocationQuery;
    } else { 
      paramsToUpdate.keywords = jobKeywordsQuery;
      paramsToUpdate.jobLocation = jobLocationQuery;
    }
    updateUrlAndSearch(paramsToUpdate);
  };

  const handleApplyFilters = () => {
    const paramsToUpdate: Record<string, string | null> = { mode: searchMode };
    if (searchMode === 'providers') {
      paramsToUpdate.category = selectedProviderCategory === 'All' ? null : selectedProviderCategory;
      paramsToUpdate.minRating = minRating === null || minRating === 0 ? null : minRating.toString();
      paramsToUpdate.verifiedOnly = verifiedOnly ? 'true' : null;
      paramsToUpdate.query = providerSearchQuery || null;
      paramsToUpdate.location = providerLocationQuery || null;
    } else { 
      paramsToUpdate.jobCategory = selectedJobCategory === 'All' ? null : selectedJobCategory;
      paramsToUpdate.keywords = jobKeywordsQuery || null;
      paramsToUpdate.jobLocation = jobLocationQuery || null;
    }
    updateUrlAndSearch(paramsToUpdate);
  };
  
  const handleModeChange = (newMode: SearchMode) => {
    setSearchMode(newMode); 
    const query = new URLSearchParams();
    query.set('mode', newMode);
    
    if (newMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true') {
        query.set('myJobs', 'true');
        if (memoizedNextSearchParams.get('status')) { 
            query.set('status', memoizedNextSearchParams.get('status')!);
        }
    }
    router.push(`/search?${query.toString()}`, { scroll: false });
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
              {(isLoading && searchMode === 'providers') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
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
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" disabled={isLoading || (authLoading && memoizedNextSearchParams.get('myJobs') === 'true')}>
              {(isLoading && searchMode === 'jobs') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
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
              {(isLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
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
                 {searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') !== 'true' && (
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria or check back later for new job postings.</p>
                )}
                {searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true' && jobResults.length === 0 && (
                   <p className="text-sm text-muted-foreground">You haven&apos;t posted any jobs that match the current filters, or no jobs yet. <Link href="/jobs/post" className="text-primary hover:underline">Post a new job</Link>.</p>
                )}
              </div>
            )}
          {!isLoading && !hasSearched && ( 
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
                      ? 'Your posted jobs will appear here once loaded. If this is your first time, try posting a job!' 
                      : 'Use the filters to discover relevant job postings, or see all open jobs by default.')}
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

    