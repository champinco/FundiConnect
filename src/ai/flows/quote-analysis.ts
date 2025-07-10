
'use server';

/**
 * @fileOverview An AI flow to analyze job quotes for a client.
 *
 * - analyzeJobQuotes - A function that takes a job and a list of quotes
 *   and returns a helpful analysis for the client.
 * - QuoteAnalysisInput - The input type for the analyzeJobQuotes function.
 * - QuoteAnalysisOutput - The return type for the analyzeJobQuotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuoteAnalysisInputSchema = z.object({
  jobDetails: z.object({
    title: z.string(),
    description: z.string(),
  }),
  quotes: z.array(z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    messageToClient: z.string(),
    providerDetails: z.object({
      businessName: z.string(),
      rating: z.number(),
      reviewsCount: z.number(),
      yearsOfExperience: z.number(),
    }),
  })).describe('A list of quotes received for the job.'),
});
export type QuoteAnalysisInput = z.infer<typeof QuoteAnalysisInputSchema>;

const QuoteAnalysisOutputSchema = z.object({
  overallSummary: z.string().describe("A brief, two-sentence summary of the quotes received."),
  prosCons: z.array(z.object({
    quoteId: z.string(),
    providerName: z.string(),
    pros: z.array(z.string()).describe("Positive aspects of this specific quote/provider."),
    cons: z.array(z.string()).describe("Potential drawbacks or considerations for this quote/provider."),
  })).describe("A pros and cons list for each individual quote."),
  bestValueRecommendation: z.string().describe("The ID of the quote recommended as the best overall value, considering factors beyond just price."),
});
export type QuoteAnalysisOutput = z.infer<typeof QuoteAnalysisOutputSchema>;

// The main function to be called from server actions
export async function analyzeJobQuotes(input: QuoteAnalysisInput): Promise<QuoteAnalysisOutput> {
  return await quoteAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quoteAnalysisPrompt',
  input: {schema: QuoteAnalysisInputSchema},
  output: {schema: QuoteAnalysisOutputSchema},
  prompt: `You are an expert hiring assistant. Your goal is to help a client make an informed decision by analyzing the quotes they have received for a job.

Analyze the following job and the quotes received:

**Job Details:**
- Title: {{{jobDetails.title}}}
- Description: {{{jobDetails.description}}}

**Quotes Received:**
{{#each quotes}}
- **Quote ID:** {{{id}}}
  - **Provider:** {{{providerDetails.businessName}}} (Rating: {{{providerDetails.rating}}}/5 from {{{providerDetails.reviewsCount}}} reviews, {{{providerDetails.yearsOfExperience}}} years exp)
  - **Amount:** {{{currency}}} {{{amount}}}
  - **Provider's Message:** "{{{messageToClient}}}"
{{/each}}

Your task is to provide a structured analysis.
1.  **Overall Summary:** Write a brief, neutral summary of the quotes.
2.  **Pros and Cons:** For each quote, create a list of pros and cons. Consider factors like price, provider rating, experience, and the content of their message (e.g., did they sound confident, ask good questions?).
3.  **Best Value Recommendation:** Based on all factors, recommend the quote that represents the best overall value, not necessarily the lowest price. Return the ID of that quote.

Your output must be a JSON object matching the specified schema.
`,
});

const quoteAnalysisFlow = ai.defineFlow(
  {
    name: 'quoteAnalysisFlow',
    inputSchema: QuoteAnalysisInputSchema,
    outputSchema: QuoteAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      console.warn("[QuoteAnalysisFlow] AI prompt returned undefined output.");
      throw new Error("AI analysis failed to produce an output.");
    }
    return output;
  }
);
