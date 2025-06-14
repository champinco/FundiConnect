
/**
 * @fileOverview Service functions for interacting with quote data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin'; // Use Admin SDK
import { Timestamp, FieldValue, type UpdateData } from 'firebase-admin/firestore';
import type { Quote, QuoteStatus } from '@/models/quote';
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

  const batch = adminDb.batch();
  const quotesCollectionRef = adminDb.collection('quotes');
  const newQuoteRef = quotesCollectionRef.doc(); // Auto-generate ID

  const jobRef = adminDb.collection('jobs').doc(quoteData.jobId);

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  batch.set(newQuoteRef, newQuotePayload);
  batch.update(jobRef, {
    quotesReceived: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
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
    const quotesRef = adminDb.collection('quotes');
    const q = quotesRef.where('jobId', '==', jobId).orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: data.validUntil ? (data.validUntil as Timestamp).toDate() : null,
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
    const quotesRef = adminDb.collection('quotes');
    const q = quotesRef.where('providerId', '==', providerId).orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    const quotes: Quote[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quotes.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: data.validUntil ? (data.validUntil as Timestamp).toDate() : null,
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
    const quoteRef = adminDb.collection('quotes').doc(quoteId);
    const quoteSnap = await quoteRef.get();
    if (quoteSnap.exists) {
      const data = quoteSnap.data()!;
      return {
        id: quoteSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        validUntil: data.validUntil ? (data.validUntil as Timestamp).toDate() : null,
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
    const quoteRef = adminDb.collection('quotes').doc(quoteId);
    try {
        const updatePayload: UpdateData<Quote> = { // Use UpdateData for type safety
            status: newStatus,
            updatedAt: FieldValue.serverTimestamp() as Timestamp, // Correct usage for Admin SDK
        };
        await quoteRef.update(updatePayload);
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
    const quotesRef = adminDb.collection('quotes');
    const q = quotesRef.where('providerId', '==', providerId);
    const querySnapshot = await q.get();

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
