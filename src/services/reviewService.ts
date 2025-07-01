
/**
 * @fileOverview Service functions for interacting with review data in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin'; // Use Admin SDK
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Review } from '@/models/review';
import type { ProviderProfile } from '@/models/provider';
import { getUserProfileFromFirestore } from './userService';
import { getJobByIdFromFirestore } from './jobService';

export interface ReviewData {
  jobId: string;
  providerId: string;
  clientId: string;
  qualityRating: number;
  timelinessRating: number;
  professionalismRating: number;
  comment: string;
}

// Helper function to robustly convert Firestore Timestamps or other date representations to JS Date objects
const robustTimestampToDate = (timestamp: any, defaultVal: Date | null = null): Date | null => {
    if (!timestamp) return defaultVal;
    if (timestamp instanceof Date) { // Already a Date object
        return timestamp;
    }
    if (typeof (timestamp as any).toDate === 'function') { // Firestore Timestamp
        return (timestamp as import('firebase-admin/firestore').Timestamp).toDate();
    }
    // Attempt to parse if it's a string or number (e.g., ISO string, milliseconds)
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
            return d;
        }
    }
    // console.warn('Invalid timestamp encountered during conversion, using default.', timestamp);
    return defaultVal;
};

/**
 * Submits a review for a provider and updates the provider's average rating and reviews count using Admin SDK.
 * @param reviewData - The data for the review.
 * @returns A promise that resolves with the ID of the newly created review.
 */
export async function submitReview(reviewData: ReviewData): Promise<string> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Review submission failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  if (!reviewData.jobId || !reviewData.providerId || !reviewData.clientId || !reviewData.comment) {
    throw new Error('Missing required fields for submitting a review.');
  }
  if (reviewData.qualityRating < 1 || reviewData.qualityRating > 5 || reviewData.timelinessRating < 1 || reviewData.timelinessRating > 5 || reviewData.professionalismRating < 1 || reviewData.professionalismRating > 5) {
      throw new Error('Ratings must be between 1 and 5.');
  }

  const providerRef = adminDb.collection('providerProfiles').doc(reviewData.providerId);
  const reviewsCollectionRef = adminDb.collection('reviews');
  const newReviewRef = reviewsCollectionRef.doc(); // Auto-generate ID

  const existingReview = await getReviewForJobByClient(reviewData.jobId, reviewData.clientId);
  if (existingReview) {
    throw new Error('You have already submitted a review for this job.');
  }

  const clientProfile = await getUserProfileFromFirestore(reviewData.clientId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const providerSnap = await transaction.get(providerRef);
      if (!providerSnap.exists) {
        throw new Error("Provider profile not found. Cannot submit review.");
      }
      const providerData = providerSnap.data() as ProviderProfile;
      const job = await getJobByIdFromFirestore(reviewData.jobId);

      const averageRating = (reviewData.qualityRating + reviewData.timelinessRating + reviewData.professionalismRating) / 3;

      const newReviewsCount = (providerData.reviewsCount || 0) + 1;
      const oldRatingTotal = (providerData.rating || 0) * (providerData.reviewsCount || 0);
      const newAverageRating = (oldRatingTotal + averageRating) / newReviewsCount;

      transaction.set(newReviewRef, {
        jobId: reviewData.jobId,
        providerId: reviewData.providerId,
        clientId: reviewData.clientId,
        rating: averageRating,
        qualityRating: reviewData.qualityRating,
        timelinessRating: reviewData.timelinessRating,
        professionalismRating: reviewData.professionalismRating,
        isVerifiedJob: job?.status === 'completed',
        comment: reviewData.comment,
        reviewDate: FieldValue.serverTimestamp(),
        clientDetails: {
          name: clientProfile?.fullName || "Anonymous",
          photoURL: clientProfile?.photoURL || null,
        }
      });

      transaction.update(providerRef, {
        rating: newAverageRating,
        reviewsCount: newReviewsCount,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    return newReviewRef.id;
  } catch (error) {
    console.error('Error submitting review (Admin SDK):', error);
    if (error instanceof Error) {
        throw new Error(`Could not submit review: ${error.message}`);
    }
    throw new Error('Could not submit review due to an unexpected error.');
  }
}


/**
 * Retrieves a review for a specific job submitted by a specific client using Admin SDK.
 * @param jobId - The ID of the job.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with the Review object or null if not found.
 */
export async function getReviewForJobByClient(jobId: string, clientId: string): Promise<Review | null> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch review for job by client.");
    return null;
  }
  try {
    const reviewsRef = adminDb.collection('reviews');
    const q = reviewsRef
      .where('jobId', '==', jobId)
      .where('clientId', '==', clientId)
      .limit(1);
    const querySnapshot = await q.get();
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data()!;
      return {
        id: docSnap.id,
        ...data,
        reviewDate: robustTimestampToDate(data.reviewDate, new Date())!,
        editedAt: robustTimestampToDate(data.editedAt, undefined),
        providerResponseDate: robustTimestampToDate(data.providerResponseDate, undefined),
      } as Review;
    }
    return null;
  } catch (error) {
    console.error('Error fetching review for job by client (Admin SDK):', error);
    throw new Error('Could not fetch review status.');
  }
}

/**
 * Retrieves all reviews for a specific provider, ordered by date, using Admin SDK.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with an array of Review objects.
 */
export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
   if (!adminDb) {
    console.error("Admin DB not initialized. Cannot fetch reviews for provider.");
    return [];
  }
  try {
    const reviewsRef = adminDb.collection('reviews');
    const q = reviewsRef.where('providerId', '==', providerId);
    const querySnapshot = await q.get();
    const reviews: Review[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data()!;
      reviews.push({
        id: docSnap.id,
        ...data,
        reviewDate: robustTimestampToDate(data.reviewDate, new Date())!,
        editedAt: robustTimestampToDate(data.editedAt, undefined),
        providerResponseDate: robustTimestampToDate(data.providerResponseDate, undefined),
      } as Review);
    });
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews for provider (Admin SDK):', error);
    throw new Error('Could not fetch provider reviews.');
  }
}


/**
 * Adds a response from a provider to a review.
 * @param reviewId The ID of the review to respond to.
 * @param providerId The UID of the provider responding (for verification).
 * @param response The text of the response.
 * @returns A promise that resolves when the operation is complete.
 */
export async function addProviderResponseToReview(reviewId: string, providerId: string, response: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Server error: Admin DB not initialized.");
  }
  const reviewRef = adminDb.collection('reviews').doc(reviewId);

  try {
    const reviewSnap = await reviewRef.get();
    if (!reviewSnap.exists) {
      throw new Error("Review not found.");
    }
    const reviewData = reviewSnap.data() as Review;
    if (reviewData.providerId !== providerId) {
      throw new Error("You are not authorized to respond to this review.");
    }
    if (reviewData.providerResponse) {
      throw new Error("A response has already been submitted for this review.");
    }

    await reviewRef.update({
      providerResponse: response,
      providerResponseDate: FieldValue.serverTimestamp()
    });
  } catch (error: any) {
    console.error(`Error adding provider response to review ${reviewId}:`, error);
    throw new Error(error.message || 'Could not add response to review.');
  }
}
