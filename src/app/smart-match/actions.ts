
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getSmartMatchSuggestions, type SmartMatchSuggestionsInput, type SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import type { ProviderProfile } from '@/models/provider';
import type { Query as AdminQuery } from 'firebase-admin/firestore';


// Helper to ensure adminDb is available
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[SmartMatchActions] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

async function fetchProvidersForSmartMatch(jobDescription: string, location: string): Promise<SmartMatchSuggestionsInput['availableProviders']> {
  ensureDbInitialized();
  try {
    const providersRef = adminDb.collection('providerProfiles'); 
    
    const q: AdminQuery<FirebaseFirestore.DocumentData> = providersRef
      .where('isVerified', '==', true) 
      .orderBy('rating', 'desc') 
      .limit(50); 
    
    const querySnapshot = await q.get();
    const availableProviders: SmartMatchSuggestionsInput['availableProviders'] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data() as ProviderProfile;
      availableProviders.push({
        name: data.businessName,
        profile: data.bio || 'No bio available.',
        location: data.location,
        experience: `${data.yearsOfExperience} years`,
        certifications: data.certifications.map(c => `${c.name} (${c.number || 'N/A'})`),
        rating: data.rating || 0,
      });
    });
    return availableProviders;
  } catch (error: any) {
    console.error("[fetchProvidersForSmartMatch] Error fetching providers for smart match (Admin SDK). Error Details:", error.message, error.stack);
    return []; 
  }
}

export async function getSmartMatchSuggestionsAction(
  input: Omit<SmartMatchSuggestionsInput, 'availableProviders'> & { jobDescription: string; location: string }
): Promise<SmartMatchSuggestionsOutput> {
  ensureDbInitialized(); // Check at the beginning of the exported action
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
    
    const suggestions = await getSmartMatchSuggestions(fullInput);
    return suggestions;
  } catch (error: any) {
    console.error("[getSmartMatchSuggestionsAction] Error in getting smart match suggestions. Error Details:", error.message, error.stack);
    // Re-throw the error so the client can handle it, or return a structured error
    throw new Error("Failed to get smart match suggestions due to a server error. Please check server logs for details.");
  }
}
