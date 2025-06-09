
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { acceptQuoteAction, rejectQuoteAction } from "../actions";
import type { Quote } from "@/models/quote";
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';


interface AcceptRejectQuoteButtonsProps {
  jobId: string;
  quote: Quote;
  currentUserId: string | null; // Pass the current user's ID
}

export default function AcceptRejectQuoteButtons({ jobId, quote, currentUserId }: AcceptRejectQuoteButtonsProps) {
  const { toast } = useToast();
  const [isLoadingAccept, setIsLoadingAccept] = useState(false);
  const [isLoadingReject, setIsLoadingReject] = useState(false);
  const [activeUser, setActiveUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
    });
    return () => unsubscribe();
  }, []);


  const handleAccept = async () => {
    if (!activeUser || activeUser.uid !== quote.clientId) {
        toast({ title: "Unauthorized", description: "You are not authorized to accept this quote.", variant: "destructive" });
        return;
    }
    if (quote.status !== 'pending') {
        toast({ title: "Invalid Action", description: "This quote is no longer pending.", variant: "destructive" });
        return;
    }

    setIsLoadingAccept(true);
    try {
      // In a real scenario, you'd also update other quotes for this job to 'archived' or similar.
      // This is a simplified flow for now.
      // The server action should handle setting quote status to 'accepted' and job to 'assigned'.
      const result = await acceptQuoteAction(jobId, quote.id, quote.providerId);
      if (result.success) {
        toast({ title: "Quote Accepted!", description: result.message });
        // TODO: Potentially re-fetch job/quote data or update UI state
      } else {
        toast({ title: "Failed to Accept Quote", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not accept quote.", variant: "destructive" });
    } finally {
      setIsLoadingAccept(false);
    }
  };

  const handleReject = async () => {
     if (!activeUser || activeUser.uid !== quote.clientId) {
        toast({ title: "Unauthorized", description: "You are not authorized to reject this quote.", variant: "destructive" });
        return;
    }
     if (quote.status !== 'pending') {
        toast({ title: "Invalid Action", description: "This quote is no longer pending.", variant: "destructive" });
        return;
    }
    setIsLoadingReject(true);
    try {
      // The server action should handle setting quote status to 'rejected'.
      const result = await rejectQuoteAction(quote.id);
      if (result.success) {
        toast({ title: "Quote Rejected", description: result.message });
        // TODO: Potentially re-fetch job/quote data or update UI state
      } else {
        toast({ title: "Failed to Reject Quote", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not reject quote.", variant: "destructive" });
    } finally {
      setIsLoadingReject(false);
    }
  };

  // Only show buttons if the current user is the client for this quote and quote is pending
  if (!activeUser || activeUser.uid !== quote.clientId || quote.status !== 'pending') {
    return null;
  }

  return (
    <div className="flex space-x-3 mt-3">
      <Button
        onClick={handleAccept}
        disabled={isLoadingAccept || isLoadingReject}
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {isLoadingAccept ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
        Accept Quote
      </Button>
      <Button
        onClick={handleReject}
        disabled={isLoadingAccept || isLoadingReject}
        variant="outline"
        className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
      >
        {isLoadingReject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
        Reject
      </Button>
    </div>
  );
}
