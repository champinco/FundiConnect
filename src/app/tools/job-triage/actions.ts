"use server";

import { getAiJobTriage, type AiJobTriageInput, type AiJobTriageOutput } from '@/ai/flows/job-triage';

/**
 * Server action to get AI-powered job triage suggestions.
 * @param input - The job details provided by the user.
 * @returns The AI-generated triage analysis.
 */
export async function getAiJobTriageAction(input: AiJobTriageInput): Promise<AiJobTriageOutput> {
  try {
    console.log("[getAiJobTriageAction] Initiating AI analysis with input:", input);
    const suggestions = await getAiJobTriage(input);
    console.log("[getAiJobTriageAction] Received suggestions from AI:", suggestions);
    return suggestions;
  } catch (error: any) {
    console.error(`[getAiJobTriageAction] Error getting AI triage suggestions. Input: ${JSON.stringify(input)}. Error:`, error.message);
    // Re-throwing the error so the client-side can handle it.
    throw new Error(`Failed to get AI analysis: ${error.message}`);
  }
}
