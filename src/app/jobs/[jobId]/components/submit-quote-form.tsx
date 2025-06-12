
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, DollarSign } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { submitQuoteAction, checkUserAccountTypeAction } from '../actions'; 
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, analytics } from '@/lib/firebase'; 
import { logEvent } from 'firebase/analytics'; 


const quoteFormSchema = z.object({
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive({ message: "Quote amount must be a positive number." })
  ),
  currency: z.string().min(3, { message: "Currency code is required (e.g., KES)." }).default("KES"),
  messageToClient: z.string().min(10, { message: "Message must be at least 10 characters." }).max(1000),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface SubmitQuoteFormProps {
  jobId: string;
  clientId: string;
}

export default function SubmitQuoteForm({ jobId, clientId }: SubmitQuoteFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isProviderAccount, setIsProviderAccount] = useState<boolean | null>(null);
  const [isLoadingAccountType, setIsLoadingAccountType] = useState(true);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoadingAccountType(true);
        const result = await checkUserAccountTypeAction(user.uid);
        if (result.error) {
          toast({ title: "Error", description: "Could not verify account type.", variant: "destructive" });
          setIsProviderAccount(false);
        } else {
          setIsProviderAccount(result.accountType === 'provider');
        }
        setIsLoadingAccountType(false);
      } else {
        setIsProviderAccount(false);
        setIsLoadingAccountType(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      currency: "KES",
      messageToClient: "",
    },
  });

  const onSubmit = async (data: QuoteFormValues) => {
    if (!currentUser || !isProviderAccount) {
      toast({
        title: "Action Not Allowed",
        description: "You must be logged in as a service provider to submit a quote.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await submitQuoteAction({
        ...data,
        jobId,
        providerId: currentUser.uid,
        clientId, 
      });

      if (result.success && result.quoteId) {
        toast({
          title: "Quote Submitted!",
          description: "Your quote has been sent to the client.",
        });
        if (analytics) {
          logEvent(analytics, 'submit_quote', { 
            job_id: jobId,
            quote_id: result.quoteId,
            provider_id: currentUser.uid,
            client_id: clientId,
            quote_amount: data.amount
          });
        }
        reset();
      } else {
        toast({
          title: "Failed to Submit Quote",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingAccountType || isProviderAccount === null) { 
    return (
      <Card className="mt-6 bg-card/50">
        <CardHeader>
          <CardTitle>Submit Your Quote</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Verifying your account type...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser || !isProviderAccount) {
    return null; 
  }

  return (
    <Card className="mt-6 shadow-md bg-background">
      <CardHeader>
        <CardTitle className="text-xl font-headline">Submit Your Quote</CardTitle>
        <CardDescription>Provide your proposed amount and a message to the client for this job.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="amount" className="font-semibold flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-primary" /> Quote Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="any"
                {...register("amount")}
                placeholder="e.g., 5000"
                className="mt-1"
              />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="currency" className="font-semibold">Currency</Label>
              <Input
                id="currency"
                {...register("currency")}
                defaultValue="KES"
                className="mt-1"
                disabled 
              />
              {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="messageToClient" className="font-semibold">Message to Client</Label>
            <Textarea
              id="messageToClient"
              {...register("messageToClient")}
              placeholder="Explain your quote, availability, or any questions you have."
              className="min-h-[100px] mt-1"
            />
            {errors.messageToClient && <p className="text-sm text-destructive mt-1">{errors.messageToClient.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Submit Quote</>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
