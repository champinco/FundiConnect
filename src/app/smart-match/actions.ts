"use server";

import { getSmartMatchSuggestions, type SmartMatchSuggestionsInput, type SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';

export async function getSmartMatchSuggestionsAction(
  input: SmartMatchSuggestionsInput
): Promise<SmartMatchSuggestionsOutput> {
  try {
    // In a real application, you might want to add more validation or logging here.
    const suggestions = await getSmartMatchSuggestions(input);
    return suggestions;
  } catch (error) {
    console.error("Error in getSmartMatchSuggestionsAction:", error);
    // Depending on the error, you might want to throw a more specific error
    // or return a specific error structure.
    throw new Error("Failed to get smart match suggestions due to a server error.");
  }
}
