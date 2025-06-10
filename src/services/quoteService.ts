
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
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, QuoteStatus } from '@/models/quote';
import type { Job } from '@/models/job'; // To update quotesReceived
import { getUserProfileFromFirestore } from './userService';
import { getProviderProfileFromFirestore } from './providerService';


export interface SubmitQuoteData {
  jobId: string;
  providerId: string; // UID of the Fundi
  clientId: string; // UID of the Client
  amount: number;
  currency: string;
  messageToClient: string;
}

/**
 * Creates a new quote document in Firestore and updates the job's quote count.
 * @param quoteData - The quote data object.
 * @returns A promise that resolves with the ID of the newly created quote.
 */
export async function submitQuoteForJob(quoteData: SubmitQuoteData): Promise<string> {
  if (!quoteData.jobId || !quoteData.providerId || !quoteData.clientId || quoteData.amount == null || !quoteData.currency || !quoteData.messageToClient) {
    throw new Error('Missing required fields for submitting a quote.');
  }

  const batch = writeBatch(db);
  const quotesRef = collection(db, 'quotes');
  const newQuoteRef = doc(quotesRef); // Auto-generate ID

  const jobRef = doc(db, 'jobs', quoteData.jobId);

  // Fetch provider details to embed (optional but good for display)
  const providerProfile = await getProviderProfileFromFirestore(quoteData.providerId);

  const newQuotePayload: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    jobId: quoteData.jobId,
    providerId: quoteData.providerId,
    clientId: quoteData.clientId,
    amount: Number(quoteData.amount), // Ensure amount is a number
    currency: quoteData.currency,
    messageToClient: quoteData.messageToClient,
    status: 'pending' as QuoteStatus,
    providerDetails: providerProfile ? {
        businessName: providerProfile.businessName,
        profilePictureUrl: providerProfile.profilePictureUrl || null
    } : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(newQuoteRef, newQuotePayload);

  // Increment quotesReceived on the job document
  batch.update(jobRef, {
    quotesReceived: increment(1),
    updatedAt: serverTimestamp() // Also update the job's updatedAt timestamp
  });

  try {
    await batch.commit();
    return newQuoteRef.id;
  } catch (error) {
    console.error('Error submitting quote:', error);
    throw new Error('Could not submit quote.');
  }
}

/**
 * Retrieves all quotes for a specific job.
 * @param jobId - The ID of the job.
 * @returns A promise that resolves with an array of Quote objects.
 */
export async function getQuotesForJob(jobId: string): Promise<Quote[]> {
  try {
    const quotesRef = collection(db, 'quotes');
    const q = query(quotesRef, where('jobId', '==', jobId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: (data.validUntil as Timestamp)?.toDate() || null,
      } as Quote);
    });
    return quotes;
  } catch (error) {
    console.error('Error fetching quotes for job:', error);
    throw new Error('Could not fetch quotes.');
  }
}

/**
 * Retrieves all quotes submitted by a specific provider.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with an array of Quote objects.
 */
export async function getQuotesByProvider(providerId: string): Promise<Quote[]> {
  try {
    const quotesRef = collection(db, 'quotes');
    const q = query(quotesRef, where('providerId', '==', providerId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: (data.validUntil as Timestamp)?.toDate() || null,
      } as Quote);
    });
    return quotes;
  } catch (error) {
    console.error('Error fetching quotes by provider:', error);
    throw new Error('Could not fetch provider quotes.');
  }
}

// More functions to come: acceptQuote, rejectQuote, etc.

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  try {
    const quoteRef = doc(db, 'quotes', quoteId);
    const quoteSnap = await getDoc(quoteRef);
    if (quoteSnap.exists()) {
      const data = quoteSnap.data();
      return {
        id: quoteSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: (data.validUntil as Timestamp)?.toDate() || null,
      } as Quote;
    }
    return null;
  } catch (error) {
    console.error('Error fetching quote by ID:', error);
    throw new Error('Could not fetch quote.');
  }
}

export async function updateQuoteStatus(quoteId: string, newStatus: QuoteStatus): Promise<void> {
    const quoteRef = doc(db, 'quotes', quoteId);
    try {
        await updateDoc(quoteRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error updating quote ${quoteId} status to ${newStatus}:`, error);
        throw new Error(`Could not update quote status.`);
    }
}

// In quoteService.ts, ensure updateDoc is imported
import { updateDoc } from 'firebase/firestore';


export interface ProviderQuoteSummary {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
}

/**
 * Retrieves a summary of quote counts for a specific provider.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with a ProviderQuoteSummary object.
 */
export async function getSubmittedQuotesSummaryForProvider(providerId: string): Promise<ProviderQuoteSummary> {
  const summary: ProviderQuoteSummary = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0,
  };
  try {
    const quotesRef = collection(db, 'quotes');
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
    console.error('Error fetching quote summary for provider:', error);
    return summary; // Return default summary on error
  }
}
