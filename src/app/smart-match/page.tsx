
"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Lightbulb, Info, PackageOpen } from 'lucide-react';
import type { SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import { getSmartMatchSuggestionsAction, fetchProviderDetailsForSmartMatchAction } from './actions';
import ProviderCard, { type Provider } from '@/components/provider-card';
import ProviderCardSkeleton from '@/components/skeletons/provider-card-skeleton'; 
import Link from 'next/link';
import type { ProviderProfile } from '@/models/provider';

const smartMatchSchema = z.object({
  jobDescription: z.string().min(20, 'Please provide a detailed job description (min 20 characters).'),
  location: z.string().min(3, 'Location is required.'),
  preferredCriteria: z.string().min(5, 'Preferred criteria are helpful (e.g., experience, rating).'),
});

type SmartMatchFormValues = z.infer<typeof smartMatchSchema>;

export default function SmartMatchPage() {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SmartMatchSuggestionsOutput | null>(null);
  const [suggestedProviderProfiles, setSuggestedProviderProfiles] = useState<ProviderProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SmartMatchFormValues>({
    resolver: zodResolver(smartMatchSchema),
  });

  const onSubmit: SubmitHandler<SmartMatchFormValues> = async (data) => {
    setIsLoadingAI(true);
    setIsLoadingProfiles(false); // Reset profile loading state
    setAiSuggestions(null);
    setSuggestedProviderProfiles([]);
    setError(null);
    setHasSearched(true);

    const inputForAction = {
      jobDescription: data.jobDescription,
      location: data.location,
      preferredCriteria: data.preferredCriteria,
    };

    try {
      const result = await getSmartMatchSuggestionsAction(inputForAction);
      setAiSuggestions(result);
      if (result && result.length > 0) {
        setIsLoadingProfiles(true);
        const providerIds = result.map(s => s.providerId);
        const profiles = await fetchProviderDetailsForSmartMatchAction(providerIds);
        setSuggestedProviderProfiles(profiles);
        setIsLoadingProfiles(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to get suggestions. Please try again.');
      console.error(e);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const mapProfileToProviderCardData = (profile: ProviderProfile, reason?: string): Provider => ({
    id: profile.id,
    name: profile.businessName,
    profilePictureUrl: profile.profilePictureUrl || 'https://placehold.co/300x300.png',
    rating: profile.rating,
    reviewsCount: profile.reviewsCount,
    location: profile.location,
    mainService: profile.mainService,
    isVerified: profile.isVerified,
    verificationAuthority: profile.verificationAuthority || undefined,
    bioSummary: reason || profile.bio.substring(0, 100) + (profile.bio.length > 100 ? '...' : ''),
  });


  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Smart Match Tool</CardTitle>
          </div>
          <CardDescription>
            Let our AI help you find the best Fundi for your job. Provide details below, and we&apos;ll suggest top matches from our available providers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="jobDescription" className="font-semibold">Job Description</Label>
              <Textarea
                id="jobDescription"
                {...register('jobDescription')}
                placeholder="Describe the work needed in detail. E.g., 'I need to install 3 new power outlets in my living room and fix a flickering kitchen light.'"
                className="min-h-[120px] mt-1"
                aria-invalid={errors.jobDescription ? "true" : "false"}
              />
              {errors.jobDescription && <p className="text-sm text-destructive mt-1">{errors.jobDescription.message}</p>}
            </div>

            <div>
              <Label htmlFor="location" className="font-semibold">Location</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="E.g., Kilimani, Nairobi"
                className="mt-1"
                aria-invalid={errors.location ? "true" : "false"}
              />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div>
              <Label htmlFor="preferredCriteria" className="font-semibold">Preferred Criteria</Label>
              <Input
                id="preferredCriteria"
                {...register('preferredCriteria')}
                placeholder="E.g., At least 5 years experience, EPRA certified, high ratings"
                className="mt-1"
                aria-invalid={errors.preferredCriteria ? "true" : "false"}
              />
              {errors.preferredCriteria && <p className="text-sm text-destructive mt-1">{errors.preferredCriteria.message}</p>}
            </div>
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoadingAI || isLoadingProfiles}>
              {isLoadingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Suggestions...
                </>
              ) : isLoadingProfiles ? (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Provider Details...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Get Smart Suggestions
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-8 max-w-2xl mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoadingAI || isLoadingProfiles) && hasSearched && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold font-headline text-center mb-8 text-muted-foreground">
            {isLoadingAI ? "Finding best matches..." : "Loading provider details..."}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <ProviderCardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {!isLoadingAI && !isLoadingProfiles && hasSearched && suggestedProviderProfiles.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold font-headline text-center mb-8">AI Recommended Fundis</h2>
          <Alert variant="default" className="mb-6 max-w-2xl mx-auto bg-primary/5 dark:bg-primary/10 border-primary/30">
            <Lightbulb className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold">Smart Suggestions</AlertTitle>
            <AlertDescription>
              These suggestions are based on our AI analysis of your job requirements and available provider profiles. 
              Consider these as a starting point, and always verify provider details independently.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedProviderProfiles.map((profile) => {
              const aiReason = aiSuggestions?.find(s => s.providerId === profile.id)?.reason;
              const cardData = mapProfileToProviderCardData(profile, aiReason);
              return <ProviderCard key={cardData.id} provider={cardData} />;
            })}
          </div>
        </div>
      )}

      {!isLoadingAI && !isLoadingProfiles && hasSearched && (!aiSuggestions || aiSuggestions.length === 0 || suggestedProviderProfiles.length === 0) && !error && (
         <Alert className="mt-8 max-w-2xl mx-auto" variant="default">
          <PackageOpen className="h-5 w-5" />
          <AlertTitle>No Specific AI Matches Found</AlertTitle>
          <AlertDescription>
            Our AI couldn&apos;t pinpoint specific matches this time, or we couldn&apos;t load their full profiles. This might be due to the uniqueness of your request or the current pool of providers.
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Try rephrasing your job description or preferred criteria for more clarity.</li>
              <li>Consider broadening your criteria if it was very specific.</li>
              <li>You can also <Link href="/search?mode=providers" className="font-medium text-primary hover:underline">browse all available Fundis</Link> directly.</li>
              <li>Or <Link href="/jobs/post" className="font-medium text-primary hover:underline">post your job publicly</Link> to receive quotes from interested Fundis.</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
