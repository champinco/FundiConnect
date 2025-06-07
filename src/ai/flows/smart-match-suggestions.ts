'use server';

/**
 * @fileOverview AI-powered Smart Match Suggestions flow.
 *
 * - getSmartMatchSuggestions - A function that takes a job description, location, and preferred criteria
 *   and returns a list of suggested service providers.
 * - SmartMatchSuggestionsInput - The input type for the getSmartMatchSuggestions function.
 * - SmartMatchSuggestionsOutput - The return type for the getSmartMatchSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartMatchSuggestionsInputSchema = z.object({
  jobDescription: z.string().describe('Detailed description of the job needed.'),
  location: z.string().describe('The location where the service is required.'),
  preferredCriteria: z
    .string()
    .describe('Preferred criteria for selecting a service provider (e.g., experience, rating, certifications).'),
  availableProviders: z.array(z.object({
    name: z.string(),
    profile: z.string(),
    location: z.string(),
    experience: z.string(),
    certifications: z.array(z.string()),
    rating: z.number()
  })).describe('An array of available service providers to choose from')
});
export type SmartMatchSuggestionsInput = z.infer<typeof SmartMatchSuggestionsInputSchema>;

const SmartMatchSuggestionsOutputSchema = z.array(z.object({
  name: z.string().describe('Name of the suggested service provider.'),
  reason: z.string().describe('Reason why this provider is a good match.'),
}));
export type SmartMatchSuggestionsOutput = z.infer<typeof SmartMatchSuggestionsOutputSchema>;

export async function getSmartMatchSuggestions(input: SmartMatchSuggestionsInput): Promise<SmartMatchSuggestionsOutput> {
  return smartMatchSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartMatchSuggestionsPrompt',
  input: {schema: SmartMatchSuggestionsInputSchema},
  output: {schema: SmartMatchSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to provide smart match suggestions for service providers based on user requirements.

You will receive a job description, the user's location, preferred criteria, and a list of available providers.
Your task is to analyze the information and return a list of the best service providers, along with a brief reason for each suggestion.

Job Description: {{{jobDescription}}}
Location: {{{location}}}
Preferred Criteria: {{{preferredCriteria}}}

Available Providers:
{{#each availableProviders}}
- Name: {{{name}}}, Profile: {{{profile}}}, Location: {{{location}}}, Experience: {{{experience}}}, Certifications: {{#each certifications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, Rating: {{{rating}}}
{{/each}}

Based on the above information, which service providers are the best matches?  Explain why you have chosen this particular service provider.

Format your repsonse as a JSON array.
`,
});

const smartMatchSuggestionsFlow = ai.defineFlow(
  {
    name: 'smartMatchSuggestionsFlow',
    inputSchema: SmartMatchSuggestionsInputSchema,
    outputSchema: SmartMatchSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
