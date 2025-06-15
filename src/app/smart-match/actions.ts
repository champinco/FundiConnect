
"use server";

import { getSmartMatchSuggestions, type SmartMatchSuggestionsInput, type SmartMatchSuggestionsOutput } from '@/ai/flows/smart-match-suggestions';
import { collection, query, where, getDocs, orderBy, limit, type QueryConstraint } from 'firebase-admin/firestore'; // Changed to firebase-admin/firestore
import { adminDb } from '@/lib/firebaseAdmin'; // Use adminDb
import type { ProviderProfile } from '@/models/provider';

// Helper to fetch providers from Firestore using Admin SDK
async function fetchProvidersForSmartMatch(jobDescription: string, location: string): Promise<SmartMatchSuggestionsInput['availableProviders']> {
  if (!adminDb) {
    console.error("[fetchProvidersForSmartMatch] CRITICAL: Admin DB not initialized. Cannot fetch providers.");
    return []; // Or throw new Error("Server error: Database service is not available.");
  }
  try {
    const providersRef = adminDb.collection('providerProfiles'); // Use adminDb
    
    const q = query(
      providersRef, 
      where('isVerified', '==', true), 
      orderBy('rating', 'desc'), 
      limit(50) 
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
  } catch (error: any) {
    console.error("[fetchProvidersForSmartMatch] Error fetching providers for smart match (Admin SDK). Error Details:", error.message, error.stack);
    return []; 
  }
}

export async function getSmartMatchSuggestionsAction(
  input: Omit<SmartMatchSuggestionsInput, 'availableProviders'> & { jobDescription: string; location: string }
): Promise<SmartMatchSuggestionsOutput> {
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
    throw new Error("Failed to get smart match suggestions due to a server error. Please check server logs for details.");
  }
}
