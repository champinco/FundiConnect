
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb, PackageOpen, Zap } from 'lucide-react';
import { getSmartLeadsAction, type SmartLead } from './actions';
import JobCard from '@/components/job-card';
import JobCardSkeleton from '@/components/skeletons/job-card-skeleton';

export default function SmartLeadsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [smartLeads, setSmartLeads] = useState<SmartLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleFetchLeads = async () => {
    if (!currentUser) {
      setError("Please log in to find smart leads.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSmartLeads([]);

    try {
      const leads = await getSmartLeadsAction(currentUser.uid);
      setSmartLeads(leads);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Zap className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Smart Leads AI Assistant</CardTitle>
          </div>
          <CardDescription>
            Stop searching and let our AI bring the best job leads directly to you. We'll analyze all open jobs and show you the ones that best match your skills, location, and specialties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleFetchLeads}
            disabled={isLoading || !currentUser}
            className="w-full text-lg py-6 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finding Your Best Leads...</>
            ) : (
              <><Lightbulb className="mr-2 h-5 w-5" /> Find My Smart Leads Now</>
            )}
          </Button>
          {!currentUser && <p className="text-sm text-center mt-2 text-muted-foreground">You must be logged in as a provider to use this tool.</p>}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-8 max-w-3xl mx-auto">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
         <div className="mt-12">
            <h2 className="text-2xl font-bold font-headline text-center mb-8 text-muted-foreground">
                Analyzing open jobs...
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
        </div>
      )}

      {!isLoading && hasSearched && smartLeads.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold font-headline text-center mb-8">Your Top AI-Recommended Job Leads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {smartLeads.map((lead) => (
              <div key={lead.id}>
                <Alert className="mb-2 bg-primary/10 border-primary/20">
                  <Lightbulb className="h-4 w-4 text-primary"/>
                  <AlertTitle className="font-semibold text-primary">AI Recommendation (Confidence: {lead.confidenceScore}%)</AlertTitle>
                  <AlertDescription className="text-primary/90">
                    {lead.reason}
                  </AlertDescription>
                </Alert>
                <JobCard job={lead} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && hasSearched && smartLeads.length === 0 && !error && (
        <Alert className="mt-8 max-w-2xl mx-auto" variant="default">
          <PackageOpen className="h-5 w-5" />
          <AlertTitle>No High-Confidence Leads Found</AlertTitle>
          <AlertDescription>
            Our AI couldn't find any strong matches for your profile among the current open jobs. This could mean no jobs match your specific skills or location right now.
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Ensure your profile is complete with all your skills and specialties for the best results.</li>
              <li>You can also <a href="/search?mode=jobs" className="font-medium text-primary hover:underline">browse all jobs manually</a>.</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
