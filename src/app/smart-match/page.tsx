
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Lightbulb, Info } from 'lucide-react';
import type { SmartMatchSuggestionsInput, SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import { getSmartMatchSuggestionsAction } from './actions';
import ProviderCard from '@/components/provider-card'; 
import type { Provider } from '@/components/provider-card';

const smartMatchSchema = z.object({
  jobDescription: z.string().min(20, 'Please provide a detailed job description (min 20 characters).'),
  location: z.string().min(3, 'Location is required.'),
  preferredCriteria: z.string().min(5, 'Preferred criteria are helpful (e.g., experience, rating).'),
});

type SmartMatchFormValues = z.infer<typeof smartMatchSchema>;

// This type is for the AI's output, mapping to what ProviderCard expects.
// We'll need to fetch the full provider details from Firestore based on the name
// if we want to display richer info than the AI returns.
// For now, we adapt what the AI returns.

export default function SmartMatchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartMatchSuggestionsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SmartMatchFormValues>({
    resolver: zodResolver(smartMatchSchema),
  });

  const onSubmit: SubmitHandler<SmartMatchFormValues> = async (data) => {
    setIsLoading(true);
    setSuggestions(null);
    setError(null);

    // The 'availableProviders' field is now handled by the server action
    const inputForAction = {
      jobDescription: data.jobDescription,
      location: data.location,
      preferredCriteria: data.preferredCriteria,
    };

    try {
      const result = await getSmartMatchSuggestionsAction(inputForAction);
      setSuggestions(result);
    } catch (e: any) {
      setError(e.message || 'Failed to get suggestions. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Smart Match Tool</CardTitle>
          </div>
          <CardDescription>
            Let our AI help you find the best Fundi for your job. Provide details below, and we&apos;ll suggest top matches from our verified providers.
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
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Suggestions...
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

      {suggestions && suggestions.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold font-headline text-center mb-8">Recommended Fundis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((suggestion, index) => {
              // The AI output (SmartMatchSuggestionsOutput) gives: { name: string, reason: string }
              // We need to adapt this to what ProviderCard expects, or fetch more details.
              // For now, we'll create a simplified Provider object for the card.
              // In a full app, you'd likely use the 'name' to fetch the full provider profile
              // from Firestore to get their ID, picture, actual rating, etc.
              const cardProvider: Provider = {
                id: `suggestion-${suggestion.name.replace(/\s+/g, '-')}-${index}`, // Create a unique-ish ID
                name: suggestion.name,
                profilePictureUrl: 'https://placehold.co/600x400.png', // Placeholder - AI doesn't return this
                rating: 0, // Placeholder - AI doesn't return this in current format
                reviewsCount: 0, // Placeholder
                location: "N/A", // Placeholder - AI doesn't return this directly for the card
                mainService: 'Other' as any, // Placeholder
                isVerified: false, // Placeholder
                bioSummary: suggestion.reason, // Use AI reason as bio summary
              };

              return <ProviderCard key={cardProvider.id} provider={cardProvider} />;
            })}
          </div>
        </div>
      )}

      {suggestions && suggestions.length === 0 && !isLoading && (
         <Alert className="mt-8 max-w-2xl mx-auto" variant="default">
          <Info className="h-5 w-5" />
          <AlertTitle>No Specific AI Suggestions</AlertTitle>
          <AlertDescription>
            We couldn&apos;t find specific AI matches based on your criteria with the current provider pool. 
            Try broadening your search criteria or <a href="/search" className="underline text-primary hover:text-primary/80">browse all providers directly</a>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
