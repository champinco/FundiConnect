
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
    return []; // Or throw an error
  }
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
        id: doc.id, 
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
    console.error(`[getSmartMatchSuggestionsAction] Error in getting smart match suggestions. Input: ${JSON.stringify(input)}. Error:`, error.message, error.stack, error.code);
    throw new Error(`Failed to get smart match suggestions: ${error.message}.`);
  }
}


export async function fetchProviderDetailsForSmartMatchAction(providerIds: string[]): Promise<ProviderProfile[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[fetchProviderDetailsForSmartMatchAction] CRITICAL: Firebase Admin DB not initialized. Aborting.";
    console.error(errorMsg);
    return []; // Or throw an error
  }
  if (!providerIds || providerIds.length === 0) {
    return [];
  }
  try {
    const providerPromises = providerIds.map(id => getProviderProfileFromFirestore(id));
    const providers = await Promise.all(providerPromises);
    return providers.filter(p => p !== null) as ProviderProfile[]; 
  } catch (error: any) {
    console.error(`[fetchProviderDetailsForSmartMatchAction] Error fetching provider details. IDs: ${providerIds.join(',')}. Error:`, error.message, error.stack, error.code);
    return []; 
  }
}
