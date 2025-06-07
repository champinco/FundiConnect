
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, User, Phone, Building, AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { signupUserAction } from './actions';
import { signupFormSchema, type SignupFormValues } from './schemas';
import { useState, useEffect, useRef } from 'react';
// import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'; 
import { auth } from '@/lib/firebase'; 
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // const [otpSent, setOtpSent] = useState(false);
  // const [confirmationResult, setConfirmationResult] = useState<any>(null); // To store firebase.auth.ConfirmationResult
  // const recaptchaVerifierRef = useRef<any>(null); // To store RecaptchaVerifier instance
  // const [otp, setOtp] = useState('');


  // useEffect(() => {
  //   // Initialize RecaptchaVerifier (invisible)
  //   // This should ideally be done once.
  //   if (!recaptchaVerifierRef.current && auth) {
  //     recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
  //       'size': 'invisible',
  //       'callback': (response: any) => {
  //         // reCAPTCHA solved, allow signInWithPhoneNumber.
  //         console.log("reCAPTCHA solved");
  //       },
  //       'expired-callback': () => {
  //         // Response expired. Ask user to solve reCAPTCHA again.
  //         toast({ title: "reCAPTCHA Expired", description: "Please try submitting the form again.", variant: "destructive" });
  //       }
  //     });
  //     recaptchaVerifierRef.current.render().catch((error: any) => {
  //       console.error("RecaptchaVerifier render error:", error);
  //       toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Please refresh and try again.", variant: "destructive"});
  //     });
  //   }
  // }, [auth, toast]);


  const { control, register, handleSubmit, formState: { errors }, setError } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      accountType: "client",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    
    // TODO: Implement Firebase Phone Authentication Flow
    // 1. Send OTP to data.phoneNumber using signInWithPhoneNumber and recaptchaVerifierRef.current
    // 2. If OTP sent successfully, setOtpSent(true) and store confirmationResult.
    // 3. User enters OTP (another input field would be needed).
    // 4. User submits OTP, call confirmationResult.confirm(otp).
    // 5. If successful, get firebaseUser.uid.
    // 6. Then call signupUserAction.

    toast({
        title: "Phone Auth Not Implemented",
        description: "Firebase phone authentication flow (OTP) needs to be implemented.",
        variant: "destructive"
    });
    console.warn("Placeholder: Firebase Phone Auth flow starts here with data:", data);
    
    // --- START OF PLACEHOLDER LOGIC ---
    // This is a placeholder for what would happen AFTER successful OTP verification.
    // In a real scenario, firebaseUserId would come from the phone auth credential.
    const placeholderFirebaseUserId = `fake-uid-${Date.now()}`; 
    try {
        const result = await signupUserAction(data, placeholderFirebaseUserId);
        if (result.success) {
            toast({
                title: "Account Profile Created (Placeholder)",
                description: "Your FundiConnect account profile has been created (using placeholder auth).",
                variant: "default",
            });
            router.push(data.accountType === 'provider' ? `/providers/${result.firebaseUserId}?setup=true` : '/');
        } else {
            toast({
                title: "Profile Creation Failed",
                description: result.message,
                variant: "destructive",
            });
        }
    } catch (error: any) {
        console.error("Signup Page Error (Action Call):", error);
        toast({
            title: "Signup Error",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
    }
    // --- END OF PLACEHOLDER LOGIC ---

    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join FundiConnect using your phone number.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700">
              <AlertTriangle className="h-4 w-4 !text-yellow-700" />
              <AlertDescription>
                Phone authentication (OTP flow) is not yet fully implemented. This form is a placeholder.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
               <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" {...register("fullName")} placeholder="John Doe" className="pl-10" />
              </div>
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
               <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" {...register("phoneNumber")} placeholder="+254 7XX XXX XXX" className="pl-10" />
              </div>
              {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
            </div>

            {/* OTP Input Field - to be shown after OTP is sent */}
            {/* {otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input 
                  id="otp" 
                  type="text" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code" 
                />
              </div>
            )} */}
            
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Controller
                name="accountType"
                control={control}
                render={({ field }) => (
                  <RadioGroup 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client">I need a service (Client)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="provider" id="provider" />
                      <Label htmlFor="provider">I offer a service (Fundi)</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.accountType && <p className="text-sm text-destructive">{errors.accountType.message}</p>}
            </div>

            {/* This div is for the invisible reCAPTCHA */}
            <div id="recaptcha-container"></div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Processing..." : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up / Send OTP</>}
            </Button>
            
            <div className="relative hidden"> {/* Hide Google signup */}
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign up with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full hidden" type="button" disabled={isLoading}> {/* Hide Google signup */}
               <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
              Google
            </Button>
          </CardContent>
        </form>
        <CardFooter className="text-center text-sm">
          <p>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              Log In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
