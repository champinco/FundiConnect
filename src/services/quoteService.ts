
/**
 * @fileOverview Service functions for interacting with quote data in Firestore.
 */
import {
  collection,
  addDoc,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
  getDoc,
  orderBy,
  updateDoc, 
  type FieldValue
} from 'firebase/firestore';
import { adminDb, AdminTimestamp, AdminFieldValue } from '@/lib/firebaseAdmin'; // Use Admin SDK
import type { Quote, QuoteStatus } from '@/models/quote';
// import type { Job } from '@/models/job'; // Not directly used in this file after adminDb switch
// import { getUserProfileFromFirestore } from './userService'; // Not needed if providerDetails are from providerProfile
import { getProviderProfileFromFirestore } from './providerService';


export interface SubmitQuoteData {
  jobId: string;
  providerId: string; 
  clientId: string; 
  amount: number;
  currency: string;
  messageToClient: string;
}

/**
 * Creates a new quote document in Firestore and updates the job's quote count using Admin SDK.
 * @param quoteData - The quote data object.
 * @returns A promise that resolves with the ID of the newly created quote.
 */
export async function submitQuoteForJob(quoteData: SubmitQuoteData): Promise<string> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Quote submission failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  if (!quoteData.jobId || !quoteData.providerId || !quoteData.clientId || quoteData.amount == null || !quoteData.currency || !quoteData.messageToClient) {
    throw new Error('Missing required fields for submitting a quote.');
  }

  const batch = adminDb.batch(); // Use adminDb.batch()
  const quotesRef = collection(adminDb, 'quotes');
  const newQuoteRef = doc(quotesRef); 

  const jobRef = doc(adminDb, 'jobs', quoteData.jobId);

  const providerProfile = await getProviderProfileFromFirestore(quoteData.providerId);

  const newQuotePayload: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'validUntil'> & { createdAt: FieldValue, updatedAt: FieldValue, validUntil?: FieldValue | null } = {
    jobId: quoteData.jobId,
    providerId: quoteData.providerId,
    clientId: quoteData.clientId,
    amount: Number(quoteData.amount),
    currency: quoteData.currency,
    messageToClient: quoteData.messageToClient,
    status: 'pending' as QuoteStatus,
    providerDetails: providerProfile ? {
        businessName: providerProfile.businessName,
        profilePictureUrl: providerProfile.profilePictureUrl || null
    } : undefined,
    createdAt: AdminFieldValue.serverTimestamp(),
    updatedAt: AdminFieldValue.serverTimestamp(),
  };

  batch.set(newQuoteRef, newQuotePayload);
  batch.update(jobRef, {
    quotesReceived: AdminFieldValue.increment(1), // Use AdminFieldValue
    updatedAt: AdminFieldValue.serverTimestamp() 
  });

  try {
    await batch.commit();
    return newQuoteRef.id;
  } catch (error) {
    console.error('Error submitting quote (Admin SDK):', error);
    throw new Error('Could not submit quote.');
  }
}

/**
 * Retrieves all quotes for a specific job using Admin SDK.
 * @param jobId - The ID of the job.
 * @returns A promise that resolves with an array of Quote objects.
 */
export async function getQuotesForJob(jobId: string): Promise<Quote[]> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch quotes for job.");
    return [];
  }
  try {
    const quotesRef = collection(adminDb, 'quotes');
    const q = query(quotesRef, where('jobId', '==', jobId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as AdminTimestamp)?.toDate(),
        updatedAt: (data.updatedAt as AdminTimestamp)?.toDate(),
        validUntil: (data.validUntil as AdminTimestamp)?.toDate() || null,
      } as Quote);
    });
    return quotes;
  } catch (error) {
    console.error('Error fetching quotes for job (Admin SDK):', error);
    throw new Error('Could not fetch quotes.');
  }
}

/**
 * Retrieves all quotes submitted by a specific provider using Admin SDK.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with an array of Quote objects.
 */
export async function getQuotesByProvider(providerId: string): Promise<Quote[]> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch quotes by provider.");
    return [];
  }
  try {
    const quotesRef = collection(adminDb, 'quotes');
    const q = query(quotesRef, where('providerId', '==', providerId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as AdminTimestamp)?.toDate(),
        updatedAt: (data.updatedAt as AdminTimestamp)?.toDate(),
        validUntil: (data.validUntil as AdminTimestamp)?.toDate() || null,
      } as Quote);
    });
    return quotes;
  } catch (error) {
    console.error('Error fetching quotes by provider (Admin SDK):', error);
    throw new Error('Could not fetch provider quotes.');
  }
}


export async function getQuoteById(quoteId: string): Promise<Quote | null> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch quote by ID.");
    return null;
  }
  try {
    const quoteRef = doc(adminDb, 'quotes', quoteId);
    const quoteSnap = await getDoc(quoteRef);
    if (quoteSnap.exists()) {
      const data = quoteSnap.data();
      return {
        id: quoteSnap.id,
        ...data,
        createdAt: (data.createdAt as AdminTimestamp)?.toDate(),
        updatedAt: (data.updatedAt as AdminTimestamp)?.toDate(),
        validUntil: (data.validUntil as AdminTimestamp)?.toDate() || null,
      } as Quote;
    }
    return null;
  } catch (error) {
    console.error('Error fetching quote by ID (Admin SDK):', error);
    throw new Error('Could not fetch quote.');
  }
}

export async function updateQuoteStatus(quoteId: string, newStatus: QuoteStatus): Promise<void> {
    if (!adminDb) {
      console.error("Admin DB not initialized. Cannot update quote status.");
      throw new Error("Server error: Admin DB not initialized.");
    }
    const quoteRef = doc(adminDb, 'quotes', quoteId);
    try {
        await updateDoc(quoteRef, {
            status: newStatus,
            updatedAt: AdminFieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error updating quote ${quoteId} status to ${newStatus} (Admin SDK):`, error);
        throw new Error(`Could not update quote status.`);
    }
}

export interface ProviderQuoteSummary {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

/**
 * Retrieves a summary of quote counts for a specific provider using Admin SDK.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with a ProviderQuoteSummary object.
 */
export async function getSubmittedQuotesSummaryForProvider(providerId: string): Promise<ProviderQuoteSummary> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot get quote summary.");
    return { pending: 0, accepted: 0, rejected: 0, total: 0 };
  }
  const summary: ProviderQuoteSummary = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0,
  };
  try {
    const quotesRef = collection(adminDb, 'quotes');
    const q = query(quotesRef, where('providerId', '==', providerId));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      const quote = docSnap.data() as Quote;
      summary.total++;
      if (quote.status === 'pending') summary.pending++;
      else if (quote.status === 'accepted') summary.accepted++;
      else if (quote.status === 'rejected') summary.rejected++;
    });
    return summary;
  } catch (error) {
    console.error('Error fetching quote summary for provider (Admin SDK):', error);
    return summary;
  }
}
