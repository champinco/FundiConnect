
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfileFromFirestore } from '@/services/userService';
import type { User as AppUser } from '@/models/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
              // Redirect providers to their specific edit page
              router.replace('/profile/edit');
              // setIsLoading(false) will be effectively skipped due to redirect
              return;
            }
          } else {
            // Handle case where app user profile might not exist yet for an auth user
            // This could happen if signup process was interrupted
            console.warn("User authenticated but no app profile found for UID:", user.uid);
            // Let it fall through to display a message or redirect to login/signup
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          // Only set loading to false if not redirecting
          if (appUser?.accountType !== 'provider' || !userProfile) { // userProfile might be undefined here if redirect happened
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
  }, [router]); // appUser removed from deps to avoid loop with router.replace

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!currentUser || !appUser) {
    // This state implies an issue, or the user was redirected away (e.g. to login)
    // If redirect to login happened, this part might not be hit often.
    // If appUser is null but currentUser exists, it's an incomplete profile.
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <UserCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Profile Unavailable</CardTitle>
            <CardDescription>
              Your profile could not be loaded. This might be due to an incomplete setup or an error.
              Please try logging out and logging back in, or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => auth.signOut().then(() => router.push('/auth/login'))} variant="outline">
              Logout and Login Again
            </Button>
          </CardContent>
        </Card>
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
