
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

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userProfile = await getUserProfileFromFirestore(user.uid);
          if (userProfile) {
            setAppUser(userProfile);
            if (userProfile.accountType === 'provider') {
              router.replace('/profile/edit');
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          // Check if appUser was set or if redirection is happening before setting loading to false.
          // If appUser is still null and we are not a provider, it implies an issue or incomplete profile.
          const fetchedUserProfile = await getUserProfileFromFirestore(user.uid).catch(() => null); // Re-fetch or use a state variable if needed for accuracy
          if (fetchedUserProfile?.accountType !== 'provider' || !fetchedUserProfile) {
             setIsLoading(false);
          }
        }
      } else {
        setCurrentUser(null);
        setAppUser(null);
        setIsLoading(false);
        router.push('/auth/login?redirect=/profile');
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!currentUser || !appUser) {
    // Adapted from the user-provided report for the "user data not found" case.
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto p-8">
          <UserCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">User Data Not Found</h2>
          <p className="text-muted-foreground mb-6">
            Your profile information could not be loaded. This might be due to an incomplete setup or an error.
            Please try logging out and logging back in, or contact support if the issue persists.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Go back to Home
          </Link>
          <Button onClick={() => auth.signOut().then(() => router.push('/auth/login'))} variant="outline" className="mt-4 ml-4">
            Logout & Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // If it's a client, display their profile info
  if (appUser.accountType === 'client') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-xl mx-auto shadow-xl">
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-28 w-28 mb-4 border-4 border-primary shadow-md">
              <AvatarImage src={appUser.photoURL || undefined} alt={appUser.fullName || appUser.email} data-ai-hint="user avatar" />
              <AvatarFallback className="text-4xl">
                {appUser.fullName ? appUser.fullName.substring(0, 1).toUpperCase() : appUser.email.substring(0, 1).toUpperCase()}
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

  // Fallback or if provider somehow lands here without redirect (shouldn't happen with current logic)
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p>Loading profile information...</p>
    </div>
  );
}
