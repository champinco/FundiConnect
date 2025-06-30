
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Send, ThumbsUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { submitReviewAction, checkExistingReviewAction } from '../actions';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { JobStatus } from '@/models/job';
import { useRouter } from 'next/navigation';

const reviewFormSchema = z.object({
  qualityRating: z.number().min(1, "Quality rating is required.").max(5),
  timelinessRating: z.number().min(1, "Timeliness rating is required.").max(5),
  professionalismRating: z.number().min(1, "Professionalism rating is required.").max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters.").max(1000, "Comment cannot exceed 1000 characters."),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface SubmitReviewFormProps {
  jobId: string;
  providerId: string | null | undefined; 
  clientId: string; 
  currentJobStatus: JobStatus;
}

interface StarRatingInputProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({ rating, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-8 w-8 cursor-pointer transition-colors
            ${(hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}
          `}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};


export default function SubmitReviewForm({ jobId, providerId, clientId, currentJobStatus }: SubmitReviewFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingReview, setIsCheckingReview] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState<boolean | null>(null);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      qualityRating: 0,
      timelinessRating: 0,
      professionalismRating: 0,
      comment: ""
    }
  });
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.uid === clientId && currentJobStatus === 'completed' && providerId) {
        setIsCheckingReview(true);
        const result = await checkExistingReviewAction(jobId, user.uid);
        if (result.error) {
            console.error("Error checking for existing review:", result.error);
            toast({ title: "Error", description: "Could not check previous review status.", variant: "destructive" });
            setHasAlreadyReviewed(false); 
        } else {
            setHasAlreadyReviewed(result.hasReviewed);
        }
        setIsCheckingReview(false);
      } else {
        setHasAlreadyReviewed(false); 
        setIsCheckingReview(false);
      }
    });
    return () => unsubscribe();
  }, [jobId, clientId, currentJobStatus, providerId, toast]);


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
        setHasAlreadyReviewed(true); 
        reset({ qualityRating: 0, timelinessRating: 0, professionalismRating: 0, comment: ""});
      } else {
        toast({ title: "Failed to Submit Review", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: "An unexpected error occurred: " + error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingReview) { 
    return (
        <div className="mt-8 p-6 border rounded-lg shadow-md bg-background text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading review information...</p>
        </div>
    );
  }

  if (!currentUser || currentUser.uid !== clientId || currentJobStatus !== 'completed' || !providerId) {
    return null; 
  }

  if (hasAlreadyReviewed) {
    return (
        <div className="mt-8 p-6 border rounded-lg shadow-md bg-green-50 dark:bg-green-900/30 text-center">
            <ThumbsUp className="h-10 w-10 mx-auto text-green-600 mb-3" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Thank You!</h3>
            <p className="text-sm text-green-600 dark:text-green-400">Your review has been submitted.</p>
        </div>
    );
  }


  return (
    <div className="mt-8 p-6 border-t rounded-lg shadow-md bg-background">
      <h3 className="text-xl font-semibold mb-4 font-headline">Leave a Review for the Fundi</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label className="font-semibold mb-2 block">Quality of Work</Label>
              <Controller
                name="qualityRating"
                control={control}
                render={({ field }) => <StarRatingInput rating={field.value} onRatingChange={field.onChange} />}
              />
              {errors.qualityRating && <p className="text-sm text-destructive mt-1">{errors.qualityRating.message}</p>}
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Timeliness</Label>
              <Controller
                name="timelinessRating"
                control={control}
                render={({ field }) => <StarRatingInput rating={field.value} onRatingChange={field.onChange} />}
              />
              {errors.timelinessRating && <p className="text-sm text-destructive mt-1">{errors.timelinessRating.message}</p>}
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Professionalism</Label>
              <Controller
                name="professionalismRating"
                control={control}
                render={({ field }) => <StarRatingInput rating={field.value} onRatingChange={field.onChange} />}
              />
              {errors.professionalismRating && <p className="text-sm text-destructive mt-1">{errors.professionalismRating.message}</p>}
            </div>
        </div>
        <div>
          <Label htmlFor="comment" className="font-semibold">Your Comment</Label>
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
                <Textarea
                id="comment"
                {...field}
                placeholder="Share your experience with this Fundi. Was the job done well? Were they professional? (Min. 10 characters)"
                className="min-h-[120px] mt-1"
                />
            )}
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
