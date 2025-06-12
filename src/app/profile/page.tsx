
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
// Removed direct service imports
import type { User as AppUser } from '@/models/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Edit, ShieldCheck, Mail, Phone, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { fetchUserProfilePageDataAction } from './actions'; // Import the new action

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const result = await fetchUserProfilePageDataAction(user.uid, user);
        if (result.error) {
          setError(result.error);
          setAppUser(null);
        } else if (result.wasRedirectedToEdit) {
          router.replace('/profile/edit');
          // Keep isLoading true as redirection is happening
          return; 
        } else {
          setAppUser(result.appUser);
        }
      } else {
        setAppUser(null);
        setError(null);
        router.push('/auth/login?redirect=/profile');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error || !appUser) { 
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-md mx-auto p-8">
          <UserCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">Profile Error</h2>
          <p className="text-muted-foreground mb-6">
            {error || "Your profile information could not be loaded. This might be due to an incomplete setup or an error. Please try logging out and logging back in, or contact support if the issue persists."}
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
  
  // This should only render if appUser exists and accountType is client
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
             {appUser.fullName === 'New User' && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                    It looks like your profile is new! Consider updating your full name.
                </p>
            )}
          </CardContent>
          <CardFooter className="flex-col space-y-3 pt-6">
            <Button asChild className="w-full">
                <Link href="/dashboard">
                    <Briefcase className="mr-2"/> Go to Dashboard
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback if logic is somehow bypassed (e.g. accountType is neither client nor provider, or redirection didn't occur)
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Loading profile or redirecting...</p>
       <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
       </Button>
    </div>
  );
}
