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
import { Loader2, Sparkles, Lightbulb } from 'lucide-react';
import type { SmartMatchSuggestionsInput, SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import { getSmartMatchSuggestionsAction } from './actions';
import ProviderCard from '@/components/provider-card'; // Assuming ProviderCard can display a simplified version or we adapt it.

// Mock available providers data
const mockAvailableProviders: SmartMatchSuggestionsInput['availableProviders'] = [
  { name: 'John Doe Electrics', profile: 'EPRA certified electrician with 10 years experience in residential and commercial wiring.', location: 'Nairobi CBD', experience: '10 years', certifications: ['EPRA C1'], rating: 4.8 },
  { name: 'AquaFlow Plumbers', profile: 'NCA registered plumbing services for leaks, installations, and blockages.', location: 'Westlands, Nairobi', experience: '8 years', certifications: ['NCA Plumber Grade 1'], rating: 4.5 },
  { name: 'CoolBreeze HVAC', profile: 'HVAC technician specializing in AC installation and repair for homes and offices.', location: 'Kilimani, Nairobi', experience: '5 years', certifications: ['NITA Grade 1 HVAC'], rating: 4.7 },
  { name: 'Solaris Green Energy', profile: 'Experts in solar panel and water heater installations. EPRA licensed.', location: 'Thika Road', experience: '7 years', certifications: ['EPRA Solar T2'], rating: 4.9 },
  { name: 'EverGreen Landscapes', profile: 'Professional landscaping and garden maintenance services.', location: 'Karen', experience: '12 years', certifications: ['Degree in Horticulture'], rating: 4.6 },
];


const smartMatchSchema = z.object({
  jobDescription: z.string().min(20, 'Please provide a detailed job description (min 20 characters).'),
  location: z.string().min(3, 'Location is required.'),
  preferredCriteria: z.string().min(5, 'Preferred criteria are helpful (e.g., experience, rating).'),
});

type SmartMatchFormValues = z.infer<typeof smartMatchSchema>;

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

    const input: SmartMatchSuggestionsInput = {
      ...data,
      availableProviders: mockAvailableProviders, // Using mock data for available providers
    };

    try {
      const result = await getSmartMatchSuggestionsAction(input);
      setSuggestions(result);
    } catch (e) {
      setError('Failed to get suggestions. Please try again.');
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
              const providerDetail = mockAvailableProviders.find(p => p.name === suggestion.name);
              if (!providerDetail) return null;

              // Create a simplified Provider object for ProviderCard
              const cardProvider = {
                id: `suggestion-${index}`, // Create a unique ID
                name: suggestion.name,
                profilePictureUrl: 'https://placehold.co/600x400.png', // Placeholder
                rating: providerDetail.rating,
                reviewsCount: 0, // Not in suggestion, default to 0 or fetch if available
                location: providerDetail.location,
                mainService: 'Other' as any, // Determine from profile or default
                isVerified: providerDetail.certifications.length > 0,
                verificationAuthority: providerDetail.certifications.length > 0 ? providerDetail.certifications[0].split(' ')[0] : undefined, // Basic assumption
                bioSummary: suggestion.reason, // Use AI reason as bio summary for the card
              };

              return <ProviderCard key={index} provider={cardProvider} />;
            })}
          </div>
        </div>
      )}

      {suggestions && suggestions.length === 0 && !isLoading && (
         <Alert className="mt-8 max-w-2xl mx-auto">
          <AlertTitle>No Specific Suggestions</AlertTitle>
          <AlertDescription>We couldn&apos;t find specific AI matches based on your criteria. Try broadening your search or <a href="/search" className="underline text-primary">browse all providers</a>.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
