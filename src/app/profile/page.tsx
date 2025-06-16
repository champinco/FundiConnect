
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User as AppUser } from '@/models/user';
import type { ProviderProfile } from '@/models/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, Edit, ShieldCheck, Mail, Phone, Briefcase, MapPin, Award, FileText, MessageSquare, Building, Clock, LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { fetchUserProfilePageDataAction, type UserProfilePageData } from './actions';
import VerifiedBadge from '@/components/verified-badge';
import ServiceCategoryIcon from '@/components/service-category-icon';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        console.log(`[ProfilePage] Auth state changed, user UID: ${user.uid}. Fetching profile data...`);
        const result = await fetchUserProfilePageDataAction(user.uid, user);
        if (result.error) {
          console.error(`[ProfilePage] Error fetching profile data: ${result.error}`);
          setError(result.error);
          setAppUser(null);
          setProviderProfile(null);
        } else {
          console.log(`[ProfilePage] Profile data fetched. AppUser: ${!!result.appUser}, ProviderProfile: ${!!result.providerProfile}`);
          setAppUser(result.appUser);
          setProviderProfile(result.providerProfile || null); 
        }
      } else {
        console.log('[ProfilePage] No user logged in. Redirecting to login.');
        setAppUser(null);
        setProviderProfile(null);
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
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <UserCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold mb-2 text-foreground">Profile Error</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Button asChild variant="outline" className="w-full">
                <Link href="/jobs/my-jobs">
                     My Posted Jobs
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (appUser.accountType === 'provider') {
    if (!providerProfile) {
         // This state can occur if a provider profile document is missing in Firestore
         // even though the user accountType is 'provider'.
         return (
            <div className="container mx-auto px-4 py-12 text-center">
              <Card className="max-w-md mx-auto shadow-lg">
                <CardHeader>
                  <Building className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold mb-2 text-foreground">Provider Profile Incomplete</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Your detailed provider profile could not be loaded. This usually means it wasn&apos;t fully created during signup.
                  </p>
                  <p className="text-muted-foreground mb-6">
                    Please complete your profile information.
                  </p>
                  <Button asChild variant="default">
                      <Link href="/profile/edit">Complete Your Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
        );
    }
    // Provider profile exists, display it
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="text-center pb-4">
            <Avatar className="mx-auto h-32 w-32 mb-4 border-4 border-primary shadow-lg">
              <AvatarImage src={providerProfile.profilePictureUrl || appUser.photoURL || undefined} alt={providerProfile.businessName || appUser.fullName || "Provider"} data-ai-hint="provider avatar" />
              <AvatarFallback className="text-5xl">
                {(providerProfile.businessName || appUser.fullName || "P").substring(0,1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-4xl font-headline">{providerProfile.businessName || appUser.fullName}</CardTitle>
            {providerProfile.mainService && (
                 <CardDescription className="text-lg text-primary flex items-center justify-center mt-1">
                    <ServiceCategoryIcon category={providerProfile.mainService} iconOnly className="h-5 w-5 mr-2" />
                    Specializing in {providerProfile.mainService}
                 </CardDescription>
            )}
             {providerProfile.isVerified && providerProfile.verificationAuthority && (
                <div className="mt-2 flex justify-center">
                    <VerifiedBadge authority={`${providerProfile.verificationAuthority} Verified`} isVerified={providerProfile.isVerified} />
                </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-base">
            <div className="space-y-2">
                <h3 className="font-semibold text-lg mb-2 text-primary border-b pb-1 flex items-center"><Building className="mr-2 h-5 w-5" />Business Details</h3>
                <div className="flex items-center"><Mail className="mr-3 h-5 w-5 text-muted-foreground" /> Email: {appUser.email}</div>
                {providerProfile.contactPhoneNumber && <div className="flex items-center"><Phone className="mr-3 h-5 w-5 text-muted-foreground" /> Phone: {providerProfile.contactPhoneNumber}</div>}
                <div className="flex items-center"><MapPin className="mr-3 h-5 w-5 text-muted-foreground" /> Location: {providerProfile.location}</div>
                 {providerProfile.fullAddress && <div className="flex items-center ml-8 text-sm text-muted-foreground"> {providerProfile.fullAddress}</div>}
            </div>

            {providerProfile.bio && (
                 <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary border-b pb-1 flex items-center"><FileText className="mr-2 h-5 w-5" />About Us</h3>
                    <p className="text-foreground/90 whitespace-pre-line">{providerProfile.bio}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                 {providerProfile.yearsOfExperience > 0 && (
                     <div>
                        <h4 className="font-medium flex items-center mb-1"><Award className="mr-2 h-5 w-5 text-muted-foreground" /> Experience</h4>
                        <p className="text-foreground/90">{providerProfile.yearsOfExperience} years</p>
                    </div>
                )}
                 {providerProfile.operatingHours && (
                     <div>
                        <h4 className="font-medium flex items-center mb-1"><Clock className="mr-2 h-5 w-5 text-muted-foreground" /> Operating Hours</h4>
                        <p className="text-foreground/90 whitespace-pre-line">{providerProfile.operatingHours}</p>
                    </div>
                )}
            </div>
            {providerProfile.serviceAreas && providerProfile.serviceAreas.length > 0 && (
                 <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary border-b pb-1">Service Areas</h3>
                    <div className="flex flex-wrap gap-2">
                        {providerProfile.serviceAreas.map(area => (
                            <span key={area} className="bg-muted px-3 py-1 rounded-full text-sm font-medium">{area}</span>
                        ))}
                    </div>
                </div>
            )}
             {providerProfile.website && (
                 <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary border-b pb-1 flex items-center"><LinkIcon className="mr-2 h-5 w-5"/>Website</h3>
                     <Link href={providerProfile.website.startsWith('http') ? providerProfile.website : `https://${providerProfile.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {providerProfile.website}
                    </Link>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex-col space-y-3 pt-6 border-t">
            <Button asChild className="w-full">
                <Link href="/profile/edit">
                    <Edit className="mr-2"/> Edit My Profile
                </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
                <Link href={`/providers/${appUser.uid}`}>
                     <UserCircle className="mr-2"/> View My Public Profile
                </Link>
            </Button>
             <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">
                    <Briefcase className="mr-2"/> Go to Dashboard
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback, should ideally not be reached if auth redirects properly.
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Unexpected profile state. Please try logging in again.</p>
       <Button asChild className="mt-4">
          <Link href="/auth/login">Go to Login</Link>
       </Button>
    </div>
  );
}
