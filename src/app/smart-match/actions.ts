
"use server";

import { getSmartMatchSuggestions, type SmartMatchSuggestionsInput, type SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProviderProfile } from '@/models/provider';

// Helper to fetch providers from Firestore
async function fetchProvidersForSmartMatch(jobDescription: string, location: string): Promise<SmartMatchSuggestionsInput['availableProviders']> {
  try {
    const providersRef = collection(db, 'providerProfiles');
    // Fetch a broader set of providers. For a real app, you might filter by location proximity or general service relevance based on jobDescription keywords.
    // For MVP, let's fetch a general list, maybe limit by those verified or with decent ratings.
    const q = query(
      providersRef, 
      where('isVerified', '==', true), // Example: prefer verified providers
      orderBy('rating', 'desc'), 
      limit(50) // Limit the number of providers sent to the AI
    ); 
    
    const querySnapshot = await getDocs(q);
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
  } catch (error) {
    console.error("Error fetching providers for smart match:", error);
    return []; // Return empty if error, AI flow can handle empty provider list
  }
}

export async function getSmartMatchSuggestionsAction(
  input: Omit<SmartMatchSuggestionsInput, 'availableProviders'> & { jobDescription: string; location: string }
): Promise<SmartMatchSuggestionsOutput> {
  try {
    const availableProviders = await fetchProvidersForSmartMatch(input.jobDescription, input.location);
    
    if (availableProviders.length === 0) {
      // Return empty suggestions or a specific message if no providers could be fetched
      // This helps the AI by not sending an empty list if it expects providers.
      // Or, the AI prompt could be designed to handle an empty list gracefully.
      console.warn("Smart Match: No providers found to send to AI. Returning empty suggestions.");
      return [];
    }

    const fullInput: SmartMatchSuggestionsInput = {
      ...input,
      availableProviders,
    };
    
    const suggestions = await getSmartMatchSuggestions(fullInput);
    return suggestions;
  } catch (error) {
    console.error("Error in getSmartMatchSuggestionsAction:", error);
    throw new Error("Failed to get smart match suggestions due to a server error.");
  }
}
