
"use client";

import { useState, useEffect, type FormEvent, useMemo, Suspense, useCallback, useRef } from 'react';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton';
import JobCard, { type JobCardProps } from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';
import Image from 'next/image'; // Added for banner image

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Star, MapPin, Search as SearchIcon, Loader2, Info, Briefcase, PackageOpen } from 'lucide-react';
import type { ServiceCategory } from '@/components/service-category-icon';
import { searchProvidersAction, type SearchParams as ProviderSearchParams, searchJobsAction, type JobSearchParams, type JobSearchResult } from './actions';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { JobStatus } from '@/models/job';
import { fetchCurrentAppUserTypeAction } from '@/app/profile/actions';
import type { User as AppUser } from '@/models/user';


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
  const [currentUserAccountType, setCurrentUserAccountType] = useState<AppUser['accountType'] | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [searchMode, setSearchMode] = useState<SearchMode>('providers');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerLocationQuery, setProviderLocationQuery] = useState('');
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<ServiceCategory | 'All'>('All');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [jobKeywordsQuery, setJobKeywordsQuery] = useState('');
  const [jobLocationQuery, setJobLocationQuery] = useState(''); // User's input for job location
  const [selectedJobCategory, setSelectedJobCategory] = useState<ServiceCategory | 'All'>('All');
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [providerResults, setProviderResults] = useState<Provider[]>([]);
  const [jobResults, setJobResults] = useState<JobCardProps['job'][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [effectiveJobSearchLocation, setEffectiveJobSearchLocation] = useState<string | null | undefined>(null);


  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const type = await fetchCurrentAppUserTypeAction(user.uid);
        setCurrentUserAccountType(type);
      } else {
        setCurrentUserAccountType(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const executeSearch = useCallback(async (executionMode: SearchMode, paramsFromUrl: URLSearchParams) => {
    
    console.log(`[executeSearch] Called. Mode: ${executionMode}. Params: ${paramsFromUrl.toString()}`);
    setIsLoading(true);
    setHasSearched(true); 
    setEffectiveJobSearchLocation(null); // Reset effective location display

    if (executionMode === 'providers') {
      const apiParams: ProviderSearchParams = {
        query: paramsFromUrl.get('query') || '',
        location: paramsFromUrl.get('location') || '',
        category: (paramsFromUrl.get('category') as ServiceCategory | 'All') || 'All',
        minRating: paramsFromUrl.has('minRating') ? parseFloat(paramsFromUrl.get('minRating')!) : null,
        verifiedOnly: paramsFromUrl.get('verifiedOnly') === 'true',
      };
      try {
        console.log('[executeSearch] Calling searchProvidersAction with:', apiParams);
        const providers = await searchProvidersAction(apiParams);
        console.log('[executeSearch] searchProvidersAction returned, provider count:', providers.length);
        setProviderResults(providers);
      } catch (error) {
        console.error("Error searching providers:", error);
        setProviderResults([]); 
      }
    } else if (executionMode === 'jobs') {
      const myJobsFlag = paramsFromUrl.get('myJobs') === 'true';
      const statusParamFromUrl = paramsFromUrl.get('status') as JobStatus | 'all_my' | null;

      if (myJobsFlag && !currentUser) { 
        console.log('[executeSearch] "My Jobs" search attempted without user. Clearing results.');
        setJobResults([]);
        setIsLoading(false); 
        return;
      }

      const apiParams: JobSearchParams = {
        keywords: paramsFromUrl.get('keywords') || '',
        location: paramsFromUrl.get('jobLocation') || '', // Use 'jobLocation' from URL for explicit search
        category: (paramsFromUrl.get('jobCategory') as ServiceCategory | 'All') || 'All',
        isMyJobsSearch: myJobsFlag,
        currentUserId: currentUser ? currentUser.uid : null, // Pass current user ID for potential default location
        filterByStatus: statusParamFromUrl,
      };
      try {
        console.log('[executeSearch] Calling searchJobsAction with:', apiParams);
        const result: JobSearchResult = await searchJobsAction(apiParams);
        console.log('[executeSearch] searchJobsAction returned, job count:', result.jobs.length, 'Effective Loc:', result.effectiveLocationUsed);
        setJobResults(result.jobs);
        setEffectiveJobSearchLocation(result.effectiveLocationUsed);
      } catch (error) {
        console.error("Error searching jobs:", error);
        setJobResults([]);
      }
    }
    setIsLoading(false);
    console.log('[executeSearch] Finished, isLoading set to false.');
  }, [authLoading, currentUser, router, setIsLoading, setHasSearched, setProviderResults, setJobResults, setEffectiveJobSearchLocation]);


  useEffect(() => {
    const currentUrlParams = new URLSearchParams(memoizedNextSearchParams.toString());
    const myJobsActive = currentUrlParams.get('myJobs') === 'true';
    const modeFromUrl = (currentUrlParams.get('mode') as SearchMode) || (myJobsActive ? 'jobs' : 'providers');

    console.log('[SearchPage useEffect] Running. Mode:', modeFromUrl, 'MyJobs:', myJobsActive, 'AuthLoading:', authLoading, 'User:', !!currentUser, 'URLParams:', currentUrlParams.toString());

    if (authLoading && myJobsActive && modeFromUrl === 'jobs' && !currentUser) {
      console.log('[SearchPage useEffect] "My Jobs" view, auth is loading, no current user yet. Setting isLoading=true.');
      setIsLoading(true); 
      return; 
    }

    if (searchMode !== modeFromUrl) {
        setSearchMode(modeFromUrl);
    }

    if (modeFromUrl === 'providers') {
      setProviderSearchQuery(currentUrlParams.get('query') || '');
      setProviderLocationQuery(currentUrlParams.get('location') || '');
      setSelectedProviderCategory((currentUrlParams.get('category') as ServiceCategory | 'All') || 'All');
      const ratingFromUrl = currentUrlParams.get('minRating');
      setMinRating(ratingFromUrl ? parseFloat(ratingFromUrl) : null);
      setVerifiedOnly(currentUrlParams.get('verifiedOnly') === 'true');
    } else { 
      setJobKeywordsQuery(currentUrlParams.get('keywords') || '');
      setJobLocationQuery(currentUrlParams.get('jobLocation') || ''); // Reflects what's in URL or user typed
      setSelectedJobCategory((currentUrlParams.get('jobCategory') as ServiceCategory | 'All') || 'All');
      setJobStatusFilter(currentUrlParams.get('status') || null);
    }

    let performSearchNow = false;
    if (modeFromUrl === 'providers') {
      performSearchNow = true; 
    } else if (modeFromUrl === 'jobs') {
      if (myJobsActive) {
        if (currentUser && !authLoading) { 
          performSearchNow = true;
        } else if (!currentUser && !authLoading) { 
          setIsLoading(false); setJobResults([]); setHasSearched(true); 
        }
      } else { 
        performSearchNow = true; 
      }
    }


    if (performSearchNow) {
      console.log(`[SearchPage useEffect] Conditions met, calling executeSearch for mode: ${modeFromUrl}`);
      executeSearch(modeFromUrl, currentUrlParams);
    } else if (!isLoadingRef.current) { 
      console.log(`[SearchPage useEffect] Conditions NOT met for auto-search. Mode: ${modeFromUrl}. HasSearched: ${hasSearched}`);
      if (modeFromUrl === 'providers' && !(currentUrlParams.has('query') || currentUrlParams.has('location') || (currentUrlParams.get('category') && currentUrlParams.get('category') !== 'All') || currentUrlParams.has('minRating') || currentUrlParams.get('verifiedOnly') === 'true')) {
        setHasSearched(false); 
        setProviderResults([]); 
      }
    }
  }, [memoizedNextSearchParams, authLoading, currentUser, executeSearch, searchMode]); 


  const updateUrlAndSearch = (newParams: Record<string, string | null>) => {
    const query = new URLSearchParams(window.location.search);

    query.set('mode', searchMode);


    Object.entries(newParams).forEach(([key, value]) => {
      if (key === 'mode') return; 
      if (value === null || value === '' || (key === 'minRating' && value === "0") || (key === 'category' && value === 'All') || (key === 'jobCategory' && value === 'All') || (key === 'status' && value === 'all_my')) {
        query.delete(key);
      } else {
        query.set(key, value);
      }
    });
    
    if (searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true') {
        query.set('myJobs', 'true');
         if (!newParams.status && !query.has('status')) query.set('status', 'all_my'); // Ensure status for myJobs
    } else if (searchMode !== 'jobs' || memoizedNextSearchParams.get('myJobs') !== 'true') {
        query.delete('myJobs'); 
        query.delete('status'); 
    }


    console.log('[updateUrlAndSearch] New Query:', query.toString());
    router.push(`/search?${query.toString()}`, { scroll: false });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('[handleFormSubmit] Triggered for mode:', searchMode);
    const paramsToUpdate: Record<string, string | null> = {}; 
    if (searchMode === 'providers') {
      paramsToUpdate.query = providerSearchQuery || null; 
      paramsToUpdate.location = providerLocationQuery || null;
      paramsToUpdate.category = selectedProviderCategory === 'All' ? null : selectedProviderCategory;
      paramsToUpdate.minRating = minRating === null || minRating === 0 ? null : minRating.toString();
      paramsToUpdate.verifiedOnly = verifiedOnly ? 'true' : null;

    } else { 
      paramsToUpdate.keywords = jobKeywordsQuery || null;
      paramsToUpdate.jobLocation = jobLocationQuery || null; // User's explicit input
      paramsToUpdate.jobCategory = selectedJobCategory === 'All' ? null : selectedJobCategory;
      if (memoizedNextSearchParams.get('myJobs') === 'true') {
        paramsToUpdate.status = jobStatusFilter || 'all_my'; 
      }
    }
    updateUrlAndSearch(paramsToUpdate);
  };

  const handleApplyFilters = () => {
    console.log('[handleApplyFilters] Triggered for mode:', searchMode);
    const paramsToUpdate: Record<string, string | null> = {};
    if (searchMode === 'providers') {
      paramsToUpdate.query = providerSearchQuery || null;
      paramsToUpdate.location = providerLocationQuery || null;
      paramsToUpdate.category = selectedProviderCategory === 'All' ? null : selectedProviderCategory;
      paramsToUpdate.minRating = minRating === null || minRating === 0 ? null : minRating.toString();
      paramsToUpdate.verifiedOnly = verifiedOnly ? 'true' : null;
    } else { 
      paramsToUpdate.keywords = jobKeywordsQuery || null;
      paramsToUpdate.jobLocation = jobLocationQuery || null; // User's explicit input
      paramsToUpdate.jobCategory = selectedJobCategory === 'All' ? null : selectedJobCategory;
      if (memoizedNextSearchParams.get('myJobs') === 'true') {
        paramsToUpdate.status = jobStatusFilter || 'all_my'; 
      }
    }
    updateUrlAndSearch(paramsToUpdate);
  };

  const handleModeChange = (newModeValue: string) => {
    const newMode = newModeValue as SearchMode;
    const query = new URLSearchParams(); 
    query.set('mode', newMode);
    // If switching to "My Jobs" implicitly via URL, or from "My Jobs" to general jobs
    if (newMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true') {
        query.set('myJobs', 'true');
        query.set('status', jobStatusFilter || 'all_my');
    }
    console.log('[handleModeChange] New mode:', newMode, 'Pushing to URL.');
    router.push(`/search?${query.toString()}`, { scroll: false });
  };

  console.log('[SearchPageContent Render]', {
    isLoading: isLoadingRef.current, 
    hasSearched,
    searchMode,
    providerResultsLength: providerResults.length,
    jobResultsLength: jobResults.length,
    memoizedNextSearchParams: memoizedNextSearchParams.toString()
  });

  const isMyJobsView = searchMode === 'jobs' && memoizedNextSearchParams.get('myJobs') === 'true';

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={searchMode} onValueChange={handleModeChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto">
          <TabsTrigger value="providers" className="text-base py-2.5">
            <SearchIcon className="mr-2 h-5 w-5" /> Find Fundis
          </TabsTrigger>
          <TabsTrigger value="jobs" className="text-base py-2.5">
            <Briefcase className="mr-2 h-5 w-5" /> Find Jobs
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Banner Image Section */}
      <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
        <div className="relative h-48 md:h-64 w-full">
          <Image
            src="https://placehold.co/1200x300.png"
            alt="Service providers banner"
            fill
            style={{ objectFit: 'cover' }}
            priority
            data-ai-hint="service providers team work"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline text-white text-center px-4" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.7)'}}>
              {searchMode === 'providers' ? 'Connect with Skilled Professionals' : 'Explore Opportunities'}
            </h2>
          </div>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="mb-8 p-6 bg-card rounded-lg shadow">
        <h1 className="text-3xl font-headline font-bold mb-2">
          {searchMode === 'providers' ? 'Find Service Providers' :
           (isMyJobsView ? 'My Posted Jobs' : 'Discover Job Opportunities')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {searchMode === 'providers'
            ? 'Search for skilled and verified Fundis for your specific needs.'
            : (isMyJobsView
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
                  disabled={isMyJobsView}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-location-query">Job Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="job-location-query"
                  placeholder={currentUserAccountType === 'provider' && !isMyJobsView ? "e.g., Westlands (or leave blank for jobs near you)" : "e.g., Westlands, Mombasa"}
                  className="pl-10"
                  value={jobLocationQuery}
                  onChange={(e) => setJobLocationQuery(e.target.value)}
                  disabled={isMyJobsView}
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto h-10 bg-accent hover:bg-accent/90" 
                    disabled={isLoading || (authLoading && isMyJobsView) || isMyJobsView}>
              {(isLoading && searchMode === 'jobs') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
              Search Jobs
            </Button>
          </div>
        )}
         {searchMode === 'jobs' && isMyJobsView && (
            <p className="text-xs text-muted-foreground mt-2">Keyword and location search is disabled for "My Jobs". Use filters on the left to refine by category or status.</p>
        )}
         {searchMode === 'jobs' && !isMyJobsView && effectiveJobSearchLocation && jobLocationQuery === '' && (
            <p className="text-xs text-muted-foreground mt-2">
                Showing jobs near your profile location: <span className="font-medium">{effectiveJobSearchLocation}</span>. Enter a specific location to override.
            </p>
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
                disabled={isMyJobsView && searchMode === 'jobs'}
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
            
            {searchMode === 'jobs' && isMyJobsView && (
                 <div>
                    <h3 className="font-medium mb-2 text-sm">Job Status</h3>
                    <Select
                        value={jobStatusFilter || 'all_my'}
                        onValueChange={(value) => setJobStatusFilter(value === 'all_my' ? 'all_my' : value as JobStatus | null)}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_my">All My Jobs</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending_quotes">Pending Quotes</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}


            <Button onClick={handleApplyFilters} className="w-full bg-primary hover:bg-primary/90" 
                    disabled={isLoading || (authLoading && searchMode === 'jobs' && isMyJobsView)}>
              {(isLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </div>
        </aside>

        <main className="w-full md:w-3/4 lg:w-4/5">
          {searchMode === 'jobs' && !isMyJobsView && effectiveJobSearchLocation && jobLocationQuery === '' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
              <Info className="inline h-4 w-4 mr-1.5" />
              Showing jobs based on your profile location: <strong>{effectiveJobSearchLocation}</strong>. Enter a specific location in the search bar to override.
            </div>
          )}
           {searchMode === 'jobs' && !isMyJobsView && effectiveJobSearchLocation && jobLocationQuery !== '' && jobLocationQuery !== effectiveJobSearchLocation && (
             <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
              <Info className="inline h-4 w-4 mr-1.5" />
               Showing jobs for location: <strong>{jobLocationQuery}</strong>.
            </div>
           )}


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
                  We couldn&apos;t find any {searchMode === 'providers' ? 'providers' : 'jobs'} matching your current filters{effectiveJobSearchLocation && searchMode === 'jobs' ? ` for location: ${effectiveJobSearchLocation}` : ""}.
                </p>
                {searchMode === 'providers' && (
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria or <Link href="/jobs/post" className="text-primary hover:underline">post a job</Link> to get quotes.</p>
                )}
                 {searchMode === 'jobs' && !isMyJobsView && (
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria or check back later for new job postings.</p>
                )}
                {searchMode === 'jobs' && isMyJobsView && jobResults.length === 0 && (
                   <p className="text-sm text-muted-foreground">You haven&apos;t posted any jobs that match the current filters, or no jobs yet. <Link href="/jobs/post" className="text-primary hover:underline">Post a new job</Link>.</p>
                )}
              </div>
            )}
          {!isLoading && !hasSearched && (
            <div className="text-center py-12 bg-card rounded-lg shadow flex flex-col items-center">
              <SearchIcon className="mx-auto h-16 w-16 text-primary mb-4" />
              <h3 className="text-2xl font-semibold mb-2">
                {searchMode === 'providers' ? 'Find Your Fundi' :
                 (isMyJobsView ? 'Your Posted Jobs' : 'Discover Job Opportunities')}
              </h3>
              <p className="text-muted-foreground">
                {searchMode === 'providers'
                  ? 'Enter your search criteria above or use filters to find available service providers.'
                  : (isMyJobsView
                      ? 'Your posted jobs will appear here. Use the filters to refine by status.'
                      : 'Use the filters to discover relevant job postings, or see all open jobs by default.')}
              </p>
               {searchMode === 'providers' && !hasSearched && (
                  <Button onClick={() => updateUrlAndSearch({})} className="mt-4 bg-primary hover:bg-primary/90" disabled={isLoading || authLoading}>
                    Browse All Providers
                  </Button>
                )}
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

