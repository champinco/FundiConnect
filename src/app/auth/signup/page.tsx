
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, User, Briefcase, Loader2, Mail, KeyRound } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { signupUserAction } from './actions';
import { signupFormSchema, type SignupFormValues as SignupFormValuesType } from './schemas'; // Renamed to avoid conflict

// Define the Zod schema including confirmPassword for client-side validation
const clientSignupFormSchema = signupFormSchema;
type ClientSignupFormValues = z.infer<typeof clientSignupFormSchema>;

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // If user is already signed up and logged in, redirect to home
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const { control, register, handleSubmit, formState: { errors } } = useForm<ClientSignupFormValues>({
    resolver: zodResolver(clientSignupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "client",
    },
  });

  const onSubmit = async (data: ClientSignupFormValues) => {
    setIsLoading(true);
    try {
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;
      toast({ title: "Auth Account Created!", description: "Now setting up your profile..." });

      // Prepare data for server action (excluding passwords)
      const profileData: SignupFormValuesType = {
        fullName: data.fullName,
        email: data.email,
        accountType: data.accountType,
        // phoneNumber is not collected in this form
      };

      // Step 2: Call the server action to create Firestore profiles
      const signupResult = await signupUserAction(profileData, firebaseUser.uid);

      if (signupResult.success) {
        toast({ title: "Account Created!", description: "Welcome to FundiConnect!" });
        router.push('/'); // Redirect to home or dashboard
      } else {
        toast({ title: "Profile Creation Failed", description: signupResult.message, variant: "destructive" });
        // Consider what to do if Firestore profile creation fails. User auth account exists.
        // Potentially, try to delete the auth user or guide them through a recovery.
        // For now, just show error.
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
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            Join FundiConnect by providing your details.
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
              <RadioGroup
                onValueChange={(value) => control._formValues.accountType = value as "client" | "provider"}
                defaultValue={control._formValues.accountType}
                className="flex space-x-4 mt-1"
                {...register("accountType")} // Ensure radio group is registered with RHF
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" disabled={isLoading} />
                  <Label htmlFor="client">I'm a Client (Looking for Fundis)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="provider" id="provider" disabled={isLoading} />
                  <Label htmlFor="provider">I'm a Fundi (Service Provider)</Label>
                </div>
              </RadioGroup>
              {errors.accountType && <p className="text-sm text-destructive mt-1">{errors.accountType.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : "Create Account"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
