
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCheck } from "lucide-react";
import { markJobAsCompletedAction } from '../actions';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { JobStatus } from '@/models/job';
import { useRouter } from 'next/navigation';

interface MarkAsCompletedButtonProps {
  jobId: string;
  currentJobStatus: JobStatus;
  jobClientId: string;
}

export default function MarkAsCompletedButton({ jobId, currentJobStatus, jobClientId }: MarkAsCompletedButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAsCompleted = async () => {
    if (!currentUser || currentUser.uid !== jobClientId) {
      toast({ title: "Unauthorized", description: "You are not authorized to perform this action.", variant: "destructive" });
      return;
    }
    if (currentJobStatus !== 'assigned' && currentJobStatus !== 'in_progress') {
      toast({ title: "Invalid Action", description: `Job cannot be marked as completed from status: ${currentJobStatus}.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await markJobAsCompletedAction(jobId, jobClientId);
      if (result.success) {
        toast({ title: "Job Status Updated", description: result.message });
        router.refresh(); // Refresh server components on the page to reflect new job status
      } else {
        toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not mark job as completed.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if the button should be visible
  const canMarkCompleted = currentUser?.uid === jobClientId && (currentJobStatus === 'assigned' || currentJobStatus === 'in_progress');

  if (!canMarkCompleted) {
    return null;
  }

  return (
    <div className="mt-6">
      <Button
        onClick={handleMarkAsCompleted}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
        ) : (
          <><CheckCheck className="mr-2 h-4 w-4" /> Mark Job as Completed</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Marking this job as completed will indicate that the Fundi has finished the work to your satisfaction.
      </p>
    </div>
  );
}
