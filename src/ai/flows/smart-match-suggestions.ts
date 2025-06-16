
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
  providerId: z.string().describe('The Firestore document ID of the suggested service provider.'), // Changed from name to providerId
  reason: z.string().describe('Reason why this provider is a good match.'),
}));
export type SmartMatchSuggestionsOutput = z.infer<typeof SmartMatchSuggestionsOutputSchema>;

export async function getSmartMatchSuggestions(input: SmartMatchSuggestionsInput): Promise<SmartMatchSuggestionsOutput> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[getSmartMatchSuggestions] CRITICAL: Firebase Admin DB not initialized. Aborting.");
    throw new Error("Server error: Core database service unavailable.");
  }
  try {
    return await smartMatchSuggestionsFlow(input);
  } catch (error) {
    console.error("[SmartMatchSuggestions] Error in getSmartMatchSuggestions wrapper:", error);
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'smartMatchSuggestionsPrompt',
  input: {schema: SmartMatchSuggestionsInputSchema},
  output: {schema: SmartMatchSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to provide smart match suggestions for service providers based on user requirements.

You will receive a job description, the user's location, preferred criteria, and a list of available providers. Each provider in the list has an 'id' field.
Your task is to analyze the information and return a list of the best service providers. For each suggested provider, you MUST include their original 'id' as 'providerId' in your response, along with a brief 'reason' for the suggestion. Do not include the provider's name in the output, only their ID and the reason.

Job Description: {{{jobDescription}}}
Location: {{{location}}}
Preferred Criteria: {{{preferredCriteria}}}

Available Providers:
{{#each availableProviders}}
- ID: {{{id}}}, Name: {{{name}}}, Profile: {{{profile}}}, Location: {{{location}}}, Experience: {{{experience}}}, Certifications: {{#each certifications}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, Rating: {{{rating}}}
{{/each}}

Based on the above information, which service providers are the best matches? For each match, provide their 'id' (as 'providerId') and a 'reason'.

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
        return []; 
      }
      return output;
    } catch (error) {
      console.error("[SmartMatchSuggestionsFlow] Error during AI prompt execution. Input:", input, "Error:", error);
      return [];
    }
  }
);

// Helper to ensure adminDb is available
const adminDb = ai.getPlugin("firebase")?.admin?.firestore();
if (!adminDb || typeof adminDb.collection !== 'function') {
  console.warn("[SmartMatchSuggestionsFlow] Could not get adminDb instance from Genkit Firebase plugin. Ensure Firebase Admin plugin is configured for Genkit if DB operations are needed directly in this flow file (they are not currently, but good to check).");
}
