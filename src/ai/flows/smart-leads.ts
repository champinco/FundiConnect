
'use server';

/**
 * @fileOverview An AI flow to find relevant job leads for a service provider.
 *
 * - findSmartLeads - A function that takes a provider's profile and a list of open jobs
 *   and returns a curated list of the best matches.
 * - FindSmartLeadsInput - The input type for the findSmartLeads function.
 * - FindSmartLeadsOutput - The return type for the findSmartLeads function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input for the AI flow
const FindSmartLeadsInputSchema = z.object({
  providerProfile: z.object({
    id: z.string(),
    businessName: z.string(),
    mainService: z.string(),
    specialties: z.array(z.string()),
    skills: z.array(z.string()),
    location: z.string(),
    bio: z.string(),
  }),
  availableJobs: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    serviceCategory: z.string(),
    location: z.string(),
    budget: z.number().optional().nullable(),
  })).describe('A list of available jobs to analyze.'),
});
export type FindSmartLeadsInput = z.infer<typeof FindSmartLeadsInputSchema>;

// Output from the AI flow
const FindSmartLeadsOutputSchema = z.array(z.object({
  jobId: z.string().describe('The ID of the recommended job.'),
  reason: z.string().describe('A brief explanation of why this job is a strong match for the provider.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) indicating how good the match is.'),
}));
export type FindSmartLeadsOutput = z.infer<typeof FindSmartLeadsOutputSchema>;

// The main function to be called from server actions
export async function findSmartLeads(input: FindSmartLeadsInput): Promise<FindSmartLeadsOutput> {
  return await smartLeadsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartLeadsPrompt',
  input: {schema: FindSmartLeadsInputSchema},
  output: {schema: FindSmartLeadsOutputSchema},
  prompt: `You are an expert recruitment assistant for service providers ("Fundis"). Your goal is to find the most relevant and profitable job leads for a specific Fundi based on their profile.

Analyze the following Fundi's profile:
- Name: {{{providerProfile.businessName}}}
- Main Service: {{{providerProfile.mainService}}}
- Location: {{{providerProfile.location}}}
- Specialties: {{#each providerProfile.specialties}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Skills: {{#each providerProfile.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Bio: {{{providerProfile.bio}}}

Now, review this list of available jobs:
{{#each availableJobs}}
- Job ID: {{{id}}}
  - Title: {{{title}}}
  - Category: {{{serviceCategory}}}
  - Location: {{{location}}}
  - Budget: {{#if budget}}KES {{{budget}}}{{else}}Not specified{{/if}}
  - Description: {{{description}}}
{{/each}}

From the list, identify the top 5 BEST job leads for this Fundi. A good match considers:
1.  **Service Alignment:** The job's category, title, and description must align perfectly with the provider's main service, specialties, and skills.
2.  **Location Proximity:** The job's location should be reasonably close to the provider's location.
3.  **Keyword Match:** Keywords in the job description should match the provider's skills and bio.

For each of the top 5 matches, provide the job ID, a concise reason for the match, and a confidence score from 0 to 100. Return your response as a JSON array, sorted from the highest confidence score to the lowest.
`,
});

const smartLeadsFlow = ai.defineFlow(
  {
    name: 'smartLeadsFlow',
    inputSchema: FindSmartLeadsInputSchema,
    outputSchema: FindSmartLeadsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      console.warn("[SmartLeadsFlow] AI prompt returned undefined output.");
      return [];
    }
    // Ensure the output is sorted by confidence score as requested
    return output.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
);
