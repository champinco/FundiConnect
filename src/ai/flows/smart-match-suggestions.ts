
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
    id: z.string().describe('The unique ID of the service provider.'), // Added provider ID
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
  providerId: z.string().describe('The Firestore document ID of the suggested service provider.'), // Added providerId
  name: z.string().describe('Name of the suggested service provider.'),
  reason: z.string().describe('Reason why this provider is a good match.'),
}));
export type SmartMatchSuggestionsOutput = z.infer<typeof SmartMatchSuggestionsOutputSchema>;

export async function getSmartMatchSuggestions(input: SmartMatchSuggestionsInput): Promise<SmartMatchSuggestionsOutput> {
  try {
    return await smartMatchSuggestionsFlow(input);
  } catch (error) {
    console.error("[SmartMatchSuggestions] Error in getSmartMatchSuggestions wrapper:", error);
    // Depending on how the calling action handles errors, you might re-throw or return empty.
    // The current action `getSmartMatchSuggestionsAction` re-throws a generic error.
    // To align with schema, we could return empty array, but action will still throw.
    // For now, let's re-throw so the action's catch block handles it.
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'smartMatchSuggestionsPrompt',
  input: {schema: SmartMatchSuggestionsInputSchema},
  output: {schema: SmartMatchSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to provide smart match suggestions for service providers based on user requirements.

You will receive a job description, the user's location, preferred criteria, and a list of available providers. Each provider in the list has an 'id' field.
Your task is to analyze the information and return a list of the best service providers. For each suggested provider, you MUST include their original 'id' as 'providerId' in your response, along with their name and a brief reason for the suggestion.

Job Description: {{{jobDescription}}}
Location: {{{location}}}
Preferred Criteria: {{{preferredCriteria}}}

Available Providers:
{{#each availableProviders}}
- ID: {{{id}}}, Name: {{{name}}}, Profile: {{{profile}}}, Location: {{{location}}}, Experience: {{{experience}}}, Certifications: {{#each certifications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, Rating: {{{rating}}}
{{/each}}

Based on the above information, which service providers are the best matches? For each match, provide their 'id' (as 'providerId'), 'name', and a 'reason'.

Format your response as a JSON array.
`,
});

const smartMatchSuggestionsFlow = ai.defineFlow(
  {
    name: 'smartMatchSuggestionsFlow',
    inputSchema: SmartMatchSuggestionsInputSchema,
    outputSchema: SmartMatchSuggestionsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn("[SmartMatchSuggestionsFlow] AI prompt returned undefined output. Input was:", input);
        return []; // Return empty array to match schema if output is unexpectedly undefined
      }
      return output;
    } catch (error) {
      console.error("[SmartMatchSuggestionsFlow] Error during AI prompt execution. Input:", input, "Error:", error);
      // Return an empty array to satisfy the output schema in case of error.
      // The calling action (`getSmartMatchSuggestionsAction`) will catch and re-throw a user-facing error.
      return [];
    }
  }
);
