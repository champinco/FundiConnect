
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import ProviderCard, { type Provider } from '@/components/provider-card';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Tier 1 services for homepage browsing
const serviceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
];

// This function remains a server-side concept but will be called via a mechanism
// if we were to keep this page as RSC and fetch on server.
// For client component, we'd fetch this in a useEffect or similar.
// For simplicity of this change focusing on the form, we'll assume featuredProviders are fetched
// as they were, but acknowledge the shift to client component means this data fetching
// might need adjustment in a full refactor (e.g., to an API route or client-side fetch).
async function getFeaturedProviders(): Promise<Provider[]> {
  try {
    const providersRef = collection(db, 'providerProfiles');
    const q = query(
      providersRef,
      where('isVerified', '==', true),
      orderBy('rating', 'desc'),
      limit(3)
    );
    const querySnapshot = await getDocs(q);
    const providers: Provider[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ProviderProfile;
      providers.push({
        id: doc.id,
        name: data.businessName,
        profilePictureUrl: data.profilePictureUrl || 'https://placehold.co/300x300.png',
        rating: data.rating,
        reviewsCount: data.reviewsCount,
        location: data.location,
        mainService: data.mainService,
        isVerified: data.isVerified,
        verificationAuthority: data.verificationAuthority,
        bioSummary: data.bio.substring(0, 150) + (data.bio.length > 150 ? '...' : ''),
      });
    });
    return providers;
  } catch (error) {
    console.error("Error fetching featured providers:", error);
    return [];
  }
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [featuredProviders, setFeaturedProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      setIsLoadingProviders(true);
      const providers = await getFeaturedProviders();
      setFeaturedProviders(providers);
      setIsLoadingProviders(false);
    }
    fetchProviders();
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
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col ">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6 text-primary">
            Find Trusted Fundis, Fast.
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
                placeholder="What service do you need? (e.g., Plumber)"
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
           <div className="mt-8">
            <Button asChild variant="link" className="text-primary hover:text-primary/80">
              <Link href="/smart-match">
                Try our AI Smart Match tool &rarr;
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
              <Link href={`/search?category=${encodeURIComponent(category)}`} key={category}>
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
          ) : featuredProviders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Could not load featured providers at this time.</p>
          )}
          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
              <Link href="/search">View All Providers</Link>
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
