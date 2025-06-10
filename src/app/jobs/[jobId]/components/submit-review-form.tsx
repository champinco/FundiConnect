
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { submitReviewAction } from '../actions';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { JobStatus } from '@/models/job';
import { getReviewForJobByClient } from '@/services/reviewService';
import { useRouter } from 'next/navigation';

const reviewFormSchema = z.object({
  rating: z.number().min(1, "Rating is required.").max(5, "Rating cannot exceed 5."),
  comment: z.string().min(10, "Comment must be at least 10 characters.").max(1000, "Comment cannot exceed 1000 characters."),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface SubmitReviewFormProps {
  jobId: string;
  providerId: string;
  clientId: string; // The original client who posted the job
  currentJobStatus: JobStatus;
}

export default function SubmitReviewForm({ jobId, providerId, clientId, currentJobStatus }: SubmitReviewFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(0);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState<boolean | null>(null);


  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: ""
    }
  });
  
  const ratingValue = watch("rating"); // Watch the rating value for dynamic star updates

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.uid === clientId && currentJobStatus === 'completed') {
        // Check if review exists only if user is the client and job is completed
        setIsLoading(true); // For the review check
        const existingReview = await getReviewForJobByClient(jobId, user.uid);
        setHasAlreadyReviewed(!!existingReview);
        setIsLoading(false);
      } else {
        setHasAlreadyReviewed(false); // Or true if not eligible to review (e.g. not the client)
      }
    });
    return () => unsubscribe();
  }, [jobId, clientId, currentJobStatus]);


  const onSubmit = async (data: ReviewFormValues) => {
    if (!currentUser || currentUser.uid !== clientId) {
      toast({ title: "Not Authorized", description: "You cannot submit a review for this job.", variant: "destructive" });
      return;
    }
    if (currentJobStatus !== 'completed') {
      toast({ title: "Job Not Completed", description: "You can only review completed jobs.", variant: "destructive" });
      return;
    }
    if (!providerId) {
      toast({ title: "Provider Not Assigned", description: "Cannot submit review as no provider is assigned to this job.", variant: "destructive" });
      return;
    }
     if (hasAlreadyReviewed) {
      toast({ title: "Already Reviewed", description: "You have already submitted a review for this job.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await submitReviewAction({
        ...data,
        jobId,
        providerId,
        clientId: currentUser.uid,
      });

      if (result.success) {
        toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
        setHasAlreadyReviewed(true); // Prevent further submissions
        reset();
        setCurrentRating(0);
        router.refresh(); // Refresh server components
      } else {
        toast({ title: "Failed to Submit Review", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "An unexpected error occurred: " + error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Conditional rendering logic for the form
  if (isLoading || hasAlreadyReviewed === null) { // Show loader while checking for existing review
    return (
        <div className="mt-6 p-4 border rounded-lg bg-card text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading review status...</p>
        </div>
    );
  }

  if (!currentUser || currentUser.uid !== clientId || currentJobStatus !== 'completed' || hasAlreadyReviewed) {
    if (hasAlreadyReviewed && currentUser?.uid === clientId && currentJobStatus === 'completed') {
         return (
            <div className="mt-6 p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 text-center">
                <Star className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">Thank you! Your review has been submitted.</p>
            </div>
        );
    }
    return null; // Don't show the form if not eligible or already reviewed
  }

  return (
    <div className="mt-8 p-6 border rounded-lg shadow-md bg-background">
      <h3 className="text-xl font-semibold mb-4 font-headline">Leave a Review</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label className="font-semibold mb-1 block">Your Rating</Label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-7 w-7 cursor-pointer transition-colors
                  ${(hoverRating || currentRating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}
                `}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => {
                  setCurrentRating(star);
                  setValue("rating", star, { shouldValidate: true });
                }}
              />
            ))}
          </div>
          {errors.rating && <p className="text-sm text-destructive mt-1">{errors.rating.message}</p>}
        </div>
        <div>
          <Label htmlFor="comment" className="font-semibold">Your Comment</Label>
          <Textarea
            id="comment"
            {...register("comment")}
            placeholder="Share your experience with this Fundi. Was the job done well? Were they professional?"
            className="min-h-[100px] mt-1"
          />
          {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>}
        </div>
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Review...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Submit Review</>
          )}
        </Button>
      </form>
    </div>
  );
}
