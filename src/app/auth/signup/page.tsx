
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, User, Briefcase, Loader2, Mail, KeyRound, Building, MapPinIcon, Phone, Award, FileText, Upload, Image as ImageIcon } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { serviceCategoriesForValidation } from '@/app/jobs/post/schemas'; 
import Image from 'next/image';

import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { auth, analytics } from '@/lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, type User as FirebaseUser } from 'firebase/auth';
import { logEvent } from 'firebase/analytics'; 
import { signupUserAction } from './actions';
import { signupFormSchema, type SignupFormValues as ServerSignupFormValues } from './schemas'; 
import type { z } from 'zod';
import { uploadFileToStorage } from '@/services/storageService'; 

type ClientSignupFormValues = z.infer<typeof signupFormSchema>;

const providerServiceCategories: ServiceCategory[] = [...serviceCategoriesForValidation];


export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const { control, register, handleSubmit, formState: { errors }, watch, reset } = useForm<ClientSignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "client",
      businessName: "",
      mainService: undefined, 
      providerLocation: "",
      contactPhoneNumber: "",
      yearsOfExperience: 0,
      bio: "",
      newProfilePictureFile: null,
      newBannerImageFile: null,
    },
  });

  const accountType = watch("accountType");

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Profile picture should be less than 5MB.", variant: "destructive" });
        return;
      }
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
    }
  };

  const handleBannerImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Banner image should be less than 5MB.", variant: "destructive" });
        return;
      }
      setBannerImageFile(file);
      setBannerImagePreview(URL.createObjectURL(file));
    } else {
      setBannerImageFile(null);
      setBannerImagePreview(null);
    }
  };

  const onSubmit = async (data: ClientSignupFormValues) => {
    setIsLoading(true);
    let profilePictureUrl: string | null = null;
    let bannerImageUrl: string | null = null;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;
      
      await sendEmailVerification(firebaseUser); 

      if (data.accountType === 'provider') {
        if (profilePictureFile) {
          try {
            profilePictureUrl = await uploadFileToStorage(profilePictureFile, `providerProfiles/${firebaseUser.uid}/profilePictures`);
          } catch (uploadError: any) {
            toast({
              title: "Profile Picture Upload Failed",
              description: uploadError.message || "Could not upload profile picture. You can add it later via Edit Profile.",
              variant: "destructive",
            });
          }
        }
        if (bannerImageFile) {
          try {
            bannerImageUrl = await uploadFileToStorage(bannerImageFile, `providerProfiles/${firebaseUser.uid}/bannerImages`);
          } catch (uploadError: any) {
            toast({
              title: "Banner Image Upload Failed",
              description: uploadError.message || "Could not upload banner image. You can add it later via Edit Profile.",
              variant: "destructive",
            });
          }
        }
      }
      
      const serverActionData: ServerSignupFormValues = {
        ...data,
        profilePictureUrl: profilePictureUrl,
        bannerImageUrl: bannerImageUrl,
      };
      if (data.yearsOfExperience === undefined) { 
        serverActionData.yearsOfExperience = 0; 
      }

      const signupResult = await signupUserAction(serverActionData, firebaseUser.uid);

      if (signupResult.success) {
        let successDescription = "Your profile setup is complete. A verification email has been sent. Please check your inbox (and spam folder) to verify. Redirecting to login...";
        if (data.accountType === 'provider') {
            successDescription = "Your basic provider profile is set up! A verification email has been sent. IMPORTANT: Go to 'My Profile' > 'Edit Profile' to add certifications, portfolio items, and other details crucial for verification and attracting clients. Redirecting to login...";
        }
        toast({ 
          title: "Signup Successful! Please Verify Your Email", 
          description: successDescription,
          duration: 10000, // Longer duration for the important message
        });
        if (analytics) {
          logEvent(analytics, 'sign_up', { 
            method: 'email', 
            account_type: data.accountType 
          });
        }
        reset(); 
        setProfilePictureFile(null);
        setProfilePicturePreview(null);
        setBannerImageFile(null);
        setBannerImagePreview(null);
        router.push('/auth/login'); 
      } else {
        toast({ title: "Profile Creation Failed", description: signupResult.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error during signup:", error);
      let errorMessage = "Failed to create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use. Please try logging in or use a different email.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      } else if (error.code) {
        errorMessage = error.message;
      }
      toast({ title: "Signup Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <p>You are already logged in. Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Join FundiConnect. Select your account type and fill in your details.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="fullName" className="font-semibold flex items-center"><User className="mr-2 h-4 w-4" /> Full Name</Label>
              <Input id="fullName" {...register("fullName")} placeholder="e.g., Juma Otieno" className="mt-1" disabled={isLoading} />
              {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email" className="font-semibold flex items-center"><Mail className="mr-2 h-4 w-4" /> Email Address</Label>
              <Input id="email" type="email" {...register("email")} placeholder="e.g., user@example.com" className="mt-1" disabled={isLoading} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="font-semibold flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Password</Label>
              <Input id="password" type="password" {...register("password")} placeholder="Min. 6 characters" className="mt-1" disabled={isLoading} />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="font-semibold flex items-center"><KeyRound className="mr-2 h-4 w-4" /> Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register("confirmPassword")} placeholder="Re-enter your password" className="mt-1" disabled={isLoading} />
              {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <div>
              <Label className="font-semibold flex items-center mb-1"><Briefcase className="mr-2 h-4 w-4" /> Account Type</Label>
              <Controller
                name="accountType"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4 mt-1"
                    disabled={isLoading}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client">I'm a Client (Looking for Fundis)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider">I'm a Fundi (Service Provider)</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.accountType && <p className="text-sm text-destructive mt-1">{errors.accountType.message}</p>}
            </div>

            {accountType === 'provider' && (
              <>
                <div className="pt-4 border-t mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-primary">Provider Details</h3>
                </div>
                <div>
                  <Label htmlFor="businessName" className="font-semibold flex items-center"><Building className="mr-2 h-4 w-4" /> Business Name</Label>
                  <Input id="businessName" {...register("businessName")} placeholder="e.g., Juma's Electrical Services" className="mt-1" disabled={isLoading}/>
                  {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="mainService" className="font-semibold flex items-center"><Briefcase className="mr-2 h-4 w-4" /> Main Service Category</Label>
                  <Controller
                    name="mainService"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <SelectTrigger id="mainService" className="mt-1">
                          <SelectValue placeholder="Select your main service" />
                        </SelectTrigger>
                        <SelectContent>
                          {providerServiceCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center">
                                <ServiceCategoryIcon category={category} iconOnly className="mr-2 h-4 w-4" />
                                {category}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.mainService && <p className="text-sm text-destructive mt-1">{errors.mainService.message}</p>}
                </div>
                <div>
                  <Label htmlFor="providerLocation" className="font-semibold flex items-center"><MapPinIcon className="mr-2 h-4 w-4" /> Primary Location</Label>
                  <Input id="providerLocation" {...register("providerLocation")} placeholder="e.g., Westlands, Nairobi" className="mt-1" disabled={isLoading}/>
                  {errors.providerLocation && <p className="text-sm text-destructive mt-1">{errors.providerLocation.message}</p>}
                </div>
                <div>
                  <Label htmlFor="contactPhoneNumber" className="font-semibold flex items-center"><Phone className="mr-2 h-4 w-4" /> Business Phone Number</Label>
                  <Input id="contactPhoneNumber" type="tel" {...register("contactPhoneNumber")} placeholder="e.g., +2547XXXXXXXX" className="mt-1" disabled={isLoading}/>
                  {errors.contactPhoneNumber && <p className="text-sm text-destructive mt-1">{errors.contactPhoneNumber.message}</p>}
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience" className="font-semibold flex items-center"><Award className="mr-2 h-4 w-4" /> Years of Experience</Label>
                  <Input id="yearsOfExperience" type="number" {...register("yearsOfExperience")} placeholder="e.g., 5" className="mt-1" disabled={isLoading}/>
                  {errors.yearsOfExperience && <p className="text-sm text-destructive mt-1">{errors.yearsOfExperience.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bio" className="font-semibold flex items-center"><FileText className="mr-2 h-4 w-4" /> Short Bio / Business Description</Label>
                  <Textarea id="bio" {...register("bio")} placeholder="Tell clients about your services, experience, and what makes you stand out (min 20 characters)." className="mt-1 min-h-[100px]" disabled={isLoading}/>
                  {errors.bio && <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="newProfilePictureFile" className="font-semibold flex items-center"><Upload className="mr-2 h-4 w-4" /> Profile Picture (Optional)</Label>
                    <Input 
                        id="newProfilePictureFile" 
                        type="file" 
                        {...register("newProfilePictureFile")}
                        onChange={handleProfilePictureChange} 
                        accept="image/png, image/jpeg, image/webp" 
                        className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                        disabled={isLoading}
                    />
                    {profilePicturePreview && (
                        <div className="mt-2">
                            <Image src={profilePicturePreview} alt="Profile preview" width={96} height={96} className="h-24 w-24 rounded-full object-cover border" data-ai-hint="profile image preview" />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. Recommended: Square image.</p>
                    {errors.newProfilePictureFile && <p className="text-sm text-destructive mt-1">{errors.newProfilePictureFile.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="newBannerImageFile" className="font-semibold flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Banner Image (Optional)</Label>
                    <Input 
                        id="newBannerImageFile" 
                        type="file" 
                        {...register("newBannerImageFile")}
                        onChange={handleBannerImageChange} 
                        accept="image/png, image/jpeg, image/webp" 
                        className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                        disabled={isLoading}
                    />
                    {bannerImagePreview && (
                        <div className="mt-2">
                            <Image src={bannerImagePreview} alt="Banner preview" width={200} height={100} className="h-24 w-48 rounded-md object-cover border" data-ai-hint="profile banner image"/>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. Recommended: Landscape image (e.g., 1200x400px).</p>
                    {errors.newBannerImageFile && <p className="text-sm text-destructive mt-1">{errors.newBannerImageFile.message}</p>}
                </div>
                 <p className="text-sm text-muted-foreground mt-4">
                  <strong>Important:</strong> After signup, go to "My Profile" &gt; "Edit Profile" to add your certifications, portfolio, and other details to become verifiable and attract more clients.
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : "Create Account"}
            </Button>
             <p className="text-xs text-muted-foreground mt-4 text-center">
                Already have an account? <a href="/auth/login" className="text-primary hover:underline hover:text-primary/80">Login here</a>.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
