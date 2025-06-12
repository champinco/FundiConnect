
/**
 * @fileOverview Service functions for interacting with review data in Firestore.
 */
import {
  collection,
  addDoc,
  doc,
  query,
  where,
  getDocs,
  runTransaction,
  getDoc,
  orderBy,
  limit,
  type FieldValue
} from 'firebase/firestore';
import { adminDb, AdminTimestamp, AdminFieldValue } from '@/lib/firebaseAdmin'; // Use Admin SDK
import type { Review } from '@/models/review';
import type { ProviderProfile } from '@/models/provider';
import { getUserProfileFromFirestore } from './userService'; // This will also use adminDb for reads from server

export interface ReviewData {
  jobId: string;
  providerId: string;
  clientId: string;
  rating: number;
  comment: string;
}

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
  if (!reviewData.jobId || !reviewData.providerId || !reviewData.clientId || reviewData.rating == null || !reviewData.comment) {
    throw new Error('Missing required fields for submitting a review.');
  }
  if (reviewData.rating < 1 || reviewData.rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  const providerRef = doc(adminDb, 'providerProfiles', reviewData.providerId);
  const reviewsRef = collection(adminDb, 'reviews');
  const newReviewRef = doc(reviewsRef); 

  const existingReview = await getReviewForJobByClient(reviewData.jobId, reviewData.clientId);
  if (existingReview) {
    throw new Error('You have already submitted a review for this job.');
  }
  
  const clientProfile = await getUserProfileFromFirestore(reviewData.clientId);

  try {
    await runTransaction(adminDb, async (transaction) => { // Use adminDb for transaction
      const providerSnap = await transaction.get(providerRef);
      if (!providerSnap.exists()) {
        throw new Error("Provider profile not found. Cannot submit review.");
      }
      const providerData = providerSnap.data() as ProviderProfile;

      const newReviewsCount = (providerData.reviewsCount || 0) + 1;
      const oldRatingTotal = (providerData.rating || 0) * (providerData.reviewsCount || 0);
      const newAverageRating = (oldRatingTotal + reviewData.rating) / newReviewsCount;

      transaction.set(newReviewRef, {
        jobId: reviewData.jobId,
        providerId: reviewData.providerId,
        clientId: reviewData.clientId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        reviewDate: AdminFieldValue.serverTimestamp(),
        clientDetails: {
          name: clientProfile?.fullName || "Anonymous",
          photoURL: clientProfile?.photoURL || null,
        }
      });

      transaction.update(providerRef, {
        rating: newAverageRating,
        reviewsCount: newReviewsCount,
        updatedAt: AdminFieldValue.serverTimestamp()
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
    const reviewsRef = collection(adminDb, 'reviews');
    const q = query(
      reviewsRef,
      where('jobId', '==', jobId),
      where('clientId', '==', clientId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        reviewDate: (data.reviewDate as AdminTimestamp)?.toDate(),
        editedAt: (data.editedAt as AdminTimestamp)?.toDate() || undefined,
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
    const reviewsRef = collection(adminDb, 'reviews');
    const q = query(reviewsRef, where('providerId', '==', providerId), orderBy('reviewDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reviews.push({
        id: docSnap.id,
        ...data,
        reviewDate: (data.reviewDate as AdminTimestamp)?.toDate(),
        editedAt: (data.editedAt as AdminTimestamp)?.toDate() || undefined,
      } as Review);
    });
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews for provider (Admin SDK):', error);
    throw new Error('Could not fetch provider reviews.');
  }
}
