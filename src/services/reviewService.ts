
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
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Review } from '@/models/review';
import type { ProviderProfile } from '@/models/provider';
import { getUserProfileFromFirestore } from './userService'; // To fetch client details

export interface ReviewData {
  jobId: string;
  providerId: string;
  clientId: string;
  rating: number;
  comment: string;
}

/**
 * Submits a review for a provider and updates the provider's average rating and reviews count.
 * @param reviewData - The data for the review.
 * @returns A promise that resolves with the ID of the newly created review.
 */
export async function submitReview(reviewData: ReviewData): Promise<string> {
  if (!reviewData.jobId || !reviewData.providerId || !reviewData.clientId || reviewData.rating == null || !reviewData.comment) {
    throw new Error('Missing required fields for submitting a review.');
  }
  if (reviewData.rating < 1 || reviewData.rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  const providerRef = doc(db, 'providerProfiles', reviewData.providerId);
  const reviewsRef = collection(db, 'reviews');
  const newReviewRef = doc(reviewsRef); // Auto-generate ID for the new review

  // Check if review already exists for this job by this client
  const existingReview = await getReviewForJobByClient(reviewData.jobId, reviewData.clientId);
  if (existingReview) {
    throw new Error('You have already submitted a review for this job.');
  }
  
  // Fetch client details to store with the review
  const clientProfile = await getUserProfileFromFirestore(reviewData.clientId);

  try {
    await runTransaction(db, async (transaction) => {
      const providerSnap = await transaction.get(providerRef);
      if (!providerSnap.exists()) {
        throw new Error("Provider profile not found. Cannot submit review.");
      }
      const providerData = providerSnap.data() as ProviderProfile;

      const newReviewsCount = (providerData.reviewsCount || 0) + 1;
      const oldRatingTotal = (providerData.rating || 0) * (providerData.reviewsCount || 0);
      const newAverageRating = (oldRatingTotal + reviewData.rating) / newReviewsCount;

      // Create the new review document
      transaction.set(newReviewRef, {
        jobId: reviewData.jobId,
        providerId: reviewData.providerId,
        clientId: reviewData.clientId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        reviewDate: serverTimestamp(),
        clientDetails: {
          name: clientProfile?.fullName || "Anonymous",
          photoURL: clientProfile?.photoURL || null,
        }
      });

      // Update provider's profile with new rating and reviews count
      transaction.update(providerRef, {
        rating: newAverageRating,
        reviewsCount: newReviewsCount,
        updatedAt: serverTimestamp()
      });
    });
    return newReviewRef.id;
  } catch (error) {
    console.error('Error submitting review:', error);
    if (error instanceof Error) {
        throw new Error(`Could not submit review: ${error.message}`);
    }
    throw new Error('Could not submit review due to an unexpected error.');
  }
}


/**
 * Retrieves a review for a specific job submitted by a specific client.
 * @param jobId - The ID of the job.
 * @param clientId - The UID of the client.
 * @returns A promise that resolves with the Review object or null if not found.
 */
export async function getReviewForJobByClient(jobId: string, clientId: string): Promise<Review | null> {
  try {
    const reviewsRef = collection(db, 'reviews');
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
        reviewDate: (data.reviewDate as Timestamp)?.toDate(),
        editedAt: (data.editedAt as Timestamp)?.toDate() || undefined,
      } as Review;
    }
    return null;
  } catch (error) {
    console.error('Error fetching review for job by client:', error);
    throw new Error('Could not fetch review status.');
  }
}

/**
 * Retrieves all reviews for a specific provider, ordered by date.
 * @param providerId - The UID of the provider.
 * @returns A promise that resolves with an array of Review objects.
 */
export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('providerId', '==', providerId), orderBy('reviewDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reviews.push({
        id: docSnap.id,
        ...data,
        reviewDate: (data.reviewDate as Timestamp)?.toDate(),
        editedAt: (data.editedAt as Timestamp)?.toDate() || undefined,
      } as Review);
    });
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews for provider:', error);
    throw new Error('Could not fetch provider reviews.');
  }
}
