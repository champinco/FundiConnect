
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getSmartMatchSuggestions, type SmartMatchSuggestionsInput, type SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import type { ProviderProfile } from '@/models/provider';
import type { Query as AdminQuery } from 'firebase-admin/firestore';
import { getProviderProfileFromFirestore } from '@/services/providerService';


async function fetchProvidersForSmartMatch(jobDescription: string, location: string): Promise<SmartMatchSuggestionsInput['availableProviders']> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchProvidersForSmartMatch] CRITICAL: Firebase Admin DB not initialized. Cannot fetch providers.";
    console.error(errorMsg);
    return [];
  }
  console.log(`[fetchProvidersForSmartMatch] Initiated. JobDesc (len): ${jobDescription.length}, Location: ${location}`);
  try {
    const providersRef = adminDb.collection('providerProfiles');
    
    // Broad initial fetch, AI will do the filtering. Consider more targeted fetch for scalability.
    const q: AdminQuery<FirebaseFirestore.DocumentData> = providersRef
      .where('isVerified', '==', true) // Only verified providers
      .orderBy('rating', 'desc') // Prioritize higher-rated ones for the AI to consider
      .limit(50); // Limit the number of providers sent to the AI
    
    const querySnapshot = await q.get();
    const availableProviders: SmartMatchSuggestionsInput['availableProviders'] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data() as ProviderProfile;
      availableProviders.push({
        id: doc.id, // Include the provider's Firestore document ID
        name: data.businessName,
        profile: data.bio || 'No bio available.',
        location: data.location,
        experience: `${data.yearsOfExperience} years`,
        certifications: data.certifications.map(c => `${c.name} (${c.number || 'N/A'})`), // Simplified cert info
        rating: data.rating || 0,
      });
    });
    console.log(`[fetchProvidersForSmartMatch] Fetched ${availableProviders.length} providers for AI consideration.`);
    return availableProviders;
  } catch (error: any) {
    console.error(`[fetchProvidersForSmartMatch] Error fetching providers. JobDesc (len): ${jobDescription.length}, Location: ${location}. Error:`, error.message, error.stack, error.code);
    return []; 
  }
}

export async function getSmartMatchSuggestionsAction(
  input: Omit<SmartMatchSuggestionsInput, 'availableProviders'> & { jobDescription: string; location: string }
): Promise<SmartMatchSuggestionsOutput> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[getSmartMatchSuggestionsAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service unavailable. Cannot get smart match suggestions.");
  }
  console.log("[getSmartMatchSuggestionsAction] Initiated with input:", input);
  try {
    const availableProviders = await fetchProvidersForSmartMatch(input.jobDescription, input.location);
    
    if (availableProviders.length === 0) {
      console.warn("[getSmartMatchSuggestionsAction] Smart Match: No providers found to send to AI. Returning empty suggestions.");
      return [];
    }

    const fullInput: SmartMatchSuggestionsInput = {
      ...input,
      availableProviders,
    };
    
    console.log("[getSmartMatchSuggestionsAction] Sending full input to AI flow:", JSON.stringify(fullInput).substring(0, 500) + "..."); // Log snippet
    const suggestions = await getSmartMatchSuggestions(fullInput);
    console.log("[getSmartMatchSuggestionsAction] Received suggestions from AI:", suggestions);
    return suggestions;
  } catch (error: any) {
    console.error(`[getSmartMatchSuggestionsAction] Error in getting smart match suggestions. Input: ${JSON.stringify(input)}. Error:`, error.message, error.stack, error.code);
    throw new Error(`Failed to get smart match suggestions: ${error.message}.`);
  }
}


export async function fetchProviderDetailsForSmartMatchAction(providerIds: string[]): Promise<ProviderProfile[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchProviderDetailsForSmartMatchAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return [];
  }
  if (!providerIds || providerIds.length === 0) {
    console.log("[fetchProviderDetailsForSmartMatchAction] No provider IDs provided.");
    return [];
  }
  console.log(`[fetchProviderDetailsForSmartMatchAction] Fetching details for provider IDs: ${providerIds.join(', ')}`);
  try {
    const providerPromises = providerIds.map(id => getProviderProfileFromFirestore(id));
    const providers = await Promise.all(providerPromises);
    const foundProviders = providers.filter(p => p !== null) as ProviderProfile[];
    console.log(`[fetchProviderDetailsForSmartMatchAction] Successfully fetched ${foundProviders.length} provider profiles.`);
    return foundProviders;
  } catch (error: any) {
    console.error(`[fetchProviderDetailsForSmartMatchAction] Error fetching provider details. IDs: ${providerIds.join(',')}. Error:`, error.message, error.stack, error.code);
    return []; 
  }
}
