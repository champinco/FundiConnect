
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Star, CheckCircle2 } from 'lucide-react'; // Added Star, CheckCircle2
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import ProviderCard, { type Provider } from '@/components/provider-card';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { fetchFeaturedProvidersAction } from '@/app/actions/home_page_actions';

const serviceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeaturedProviders() {
      setIsLoadingProviders(true);
      setFetchError(null);
      try {
        const providers = await fetchFeaturedProvidersAction();
        setFeaturedProviders(providers);
      } catch (error: any) {
        console.error("Error fetching featured providers from action:", error);
        setFetchError(error.message || "Could not load featured providers.");
        setFeaturedProviders([]);
      } finally {
        setIsLoadingProviders(false);
      }
    }
    loadFeaturedProviders();
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('query', searchQuery.trim());
    }
    if (locationQuery.trim()) {
      params.set('location', locationQuery.trim());
    }
    router.push(`/search?mode=providers&${params.toString()}`);
  };

  return (
    <div className="flex flex-col ">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6 text-primary">
            Your Trusted Local Fundi, On-Demand.
          </h1>
          <p className="text-lg md:text-xl text-foreground mb-8 max-w-2xl mx-auto">
            Connect with verified electricians, plumbers, and more across Kenya.
            Get your job done right, the first time.
          </p>
          <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="What service do you need today? (e.g., Plumber, Electrician)"
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative sm:w-1/3">
               <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Location"
                className="pl-10 h-12 text-base"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto">
              <Search className="mr-2 h-5 w-5" /> Search
            </Button>
          </form>
          <div className="mt-8 text-sm text-muted-foreground flex items-center justify-center space-x-4 md:space-x-6">
            <span className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-1.5 text-green-500" /> 10,000+ Jobs Completed</span>
            <span className="hidden sm:inline">|</span>
            <span className="flex items-center"><Star className="h-5 w-5 mr-1.5 text-yellow-400 fill-yellow-400" /> 4.8/5 Average Rating</span>
            <span className="hidden sm:inline">|</span>
            <span className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-1.5 text-green-500" /> All Providers Verified</span>
          </div>
           <div className="mt-6">
            <Button asChild variant="link" className="text-primary hover:text-primary/80">
              <Link href="/smart-match">
                <span>Try our AI Smart Match tool &rarr;</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Service Categories Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold font-headline text-center mb-10">
            Browse Services
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {serviceCategories.map((category) => (
              <Link href={`/search?mode=providers&category=${encodeURIComponent(category)}`} key={category}>
                <ServiceCategoryIcon category={category} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Providers Section */}
      <section className="py-12 md:py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold font-headline text-center mb-10">
            Top Rated Providers
          </h2>
          {isLoadingProviders ? (
             <p className="text-center text-muted-foreground">Loading featured providers...</p>
          ) : fetchError ? (
            <p className="text-center text-destructive">Error: {fetchError}</p>
          ): featuredProviders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No featured providers available at this time.</p>
          )}
          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
              <Link href="/search?mode=providers">
                <span>View All Providers</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold font-headline text-center mb-12">How FundiConnect Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 text-primary p-4 rounded-full text-3xl font-bold w-16 h-16 flex items-center justify-center">1</div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Post Your Job</h3>
              <p className="text-muted-foreground">Describe the service you need, upload photos or videos, and set your location.</p>
            </div>
            <div className="p-6 rounded-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 text-primary p-4 rounded-full text-3xl font-bold w-16 h-16 flex items-center justify-center">2</div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Quotes</h3>
              <p className="text-muted-foreground">Verified Fundis near you will send you quotes for your job.</p>
            </div>
            <div className="p-6 rounded-lg">
             <div className="flex justify-center mb-4">
                <div className="bg-primary/10 text-primary p-4 rounded-full text-3xl font-bold w-16 h-16 flex items-center justify-center">3</div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Hire & Review</h3>
              <p className="text-muted-foreground">Choose the best Fundi, get the work done, and leave a review to help others.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
