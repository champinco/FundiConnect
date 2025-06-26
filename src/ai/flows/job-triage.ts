'use server';

/**
 * @fileOverview AI-powered Job Triage & Smart Toolkit flow.
 *
 * - getAiJobTriage - A function that takes a job description and category
 *   and returns a triage analysis with suggested tools and parts.
 * - AiJobTriageInput - The input type for the getAiJobTriage function.
 * - AiJobTriageOutput - The return type for the getAiJobTriage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiJobTriageInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('A detailed description of the job or problem.'),
  serviceCategory: z.string().describe('The general category of the job (e.g., Plumbing, Electrical).'),
});
export type AiJobTriageInput = z.infer<typeof AiJobTriageInputSchema>;

const AiJobTriageOutputSchema = z.object({
  likelyCause: z.string().describe('A brief analysis of the most probable cause of the issue based on the description.'),
  suggestedParts: z.array(z.string()).describe('A list of specific parts that might be required to complete the job.'),
  suggestedTools: z.array(z.string()).describe('A list of tools likely needed for the job.'),
  urgencyAssessment: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('An assessment of the job\'s urgency.'),
  notesForArtisan: z.string().describe('Additional helpful notes, potential complexities, or questions to ask the client for clarification.'),
});
export type AiJobTriageOutput = z.infer<typeof AiJobTriageOutputSchema>;

export async function getAiJobTriage(input: AiJobTriageInput): Promise<AiJobTriageOutput> {
  try {
    return await aiJobTriageFlow(input);
  } catch (error) {
    console.error("[AiJobTriage] Error in getAiJobTriage wrapper:", error);
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'aiJobTriagePrompt',
  input: {schema: AiJobTriageInputSchema},
  output: {schema: AiJobTriageOutputSchema},
  prompt: `You are an expert artisan and diagnostician with years of experience in home and commercial repairs in Kenya. Your task is to analyze a client's job request and provide a "Smart Ticket" for another artisan.

The Smart Ticket should help the artisan prepare for the job, minimizing wasted trips by suggesting necessary tools and parts.

Analyze the following job request:

- Service Category: {{{serviceCategory}}}
- Job Title: {{{jobTitle}}}
- Job Description: {{{jobDescription}}}

Based on this information, provide a structured analysis. Be specific and practical. For example, for a "leaky kitchen tap," don't just say "plumbing tools;" suggest "basin wrench," "adjustable pliers," and "screwdriver set." For parts, suggest "faucet O-ring kit" or a specific cartridge model if possible.

Your output must be a JSON object matching the specified schema.
`,
});

const aiJobTriageFlow = ai.defineFlow(
  {
    name: 'aiJobTriageFlow',
    inputSchema: AiJobTriageInputSchema,
    outputSchema: AiJobTriageOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      console.warn("[AiJobTriageFlow] AI prompt returned undefined output. Input was:", input);
      throw new Error('AI analysis failed to produce an output.');
    }
    return output;
  }
);
