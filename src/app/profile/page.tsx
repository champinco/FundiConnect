
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfileFromFirestore } from '@/services/userService';
import type { User as AppUser } from '@/models/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Edit, ShieldCheck, Mail, Phone, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Optional: Add a specific error state if needed for fetch errors vs. not found
  // const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    // setFetchError(null); // Reset fetch error on new attempt

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userProfile = await getUserProfileFromFirestore(user.uid);
          if (userProfile) {
            setAppUser(userProfile);
            if (userProfile.accountType === 'provider') {
              router.replace('/profile/edit');
              // isLoading will remain true, and this component instance will likely unmount
              // or be superseded by the new page's rendering. No need to set isLoading false here.
            } else {
              // It's a client profile, rendering will proceed on this page.
              setIsLoading(false);
            }
          } else {
            // Firestore document for user not found
            setAppUser(null);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setAppUser(null);
          // setFetchError("Failed to load profile data. Please try again.");
          setIsLoading(false);
        }
      } else {
        // No Firebase user (logged out)
        setCurrentUser(null);
        setAppUser(null);
        // setIsLoading(false); // Redirect will happen, login page handles its own loading.
                               // However, to prevent brief flash of "User Data Not Found" before redirect,
                               // we might keep isLoading true, or ensure redirect is very fast.
                               // For now, let's set it to false as the current page's loading cycle is done.
        setIsLoading(false);
        router.push('/auth/login?redirect=/profile');
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router is stable from Next.js

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // This case means: not loading, but either currentUser (auth) is missing (should have been redirected)
  // or appUser (Firestore profile) is missing.
  if (!appUser) { 
    // If !currentUser, the redirect to /login should have ideally happened.
    // This primarily catches the scenario where currentUser exists, but appUser (Firestore doc) doesn't.
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto p-8">
          <UserCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">User Data Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Your profile information could not be loaded. This might be due to an incomplete setup or an error.
            Please try logging out and logging back in, or contact support if the issue persists.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Go back to Home</Link>
            </Button>
            <Button onClick={() => auth.signOut().then(() => router.push('/auth/login'))} variant="default">
              Logout & Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // If it's a client, display their profile info (provider would have been redirected)
  if (appUser.accountType === 'client') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-28 w-28 mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={appUser.photoURL || undefined} alt={appUser.fullName || appUser.email || "User"} data-ai-hint="user avatar" />
              <AvatarFallback className="text-4xl">
                {appUser.fullName ? appUser.fullName.substring(0, 1).toUpperCase() : appUser.email ? appUser.email.substring(0, 1).toUpperCase() : "C"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-headline">{appUser.fullName || 'Client Profile'}</CardTitle>
            <CardDescription>Your FundiConnect client account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-base">
            <div className="flex items-center">
              <Mail className="mr-3 h-5 w-5 text-primary" />
              <div>
                <span className="font-semibold">Email:</span> {appUser.email}
              </div>
            </div>
            {appUser.phoneNumber && (
              <div className="flex items-center">
                <Phone className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <span className="font-semibold">Phone:</span> {appUser.phoneNumber}
                </div>
              </div>
            )}
            <div className="flex items-center">
              <ShieldCheck className="mr-3 h-5 w-5 text-primary" />
              <div>
                <span className="font-semibold">Account Type:</span> <span className="capitalize">{appUser.accountType}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3 pt-6">
            <Button asChild className="w-full">
                <Link href="/dashboard">
                    <Briefcase className="mr-2"/> Go to Dashboard
                </Link>
            </Button>
            {/* Add a placeholder for client profile editing if desired in future */}
            {/* <Button variant="outline" className="w-full" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit My Details (Coming Soon)
            </Button> */}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback if logic is somehow bypassed (e.g. accountType is neither client nor provider, which shouldn't happen)
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">An unexpected error occurred while loading your profile.</p>
       <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
       </Button>
    </div>
  );
}
