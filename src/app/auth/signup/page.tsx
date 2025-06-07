
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, User, Phone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { signupUserAction } from './actions';
import { signupFormSchema, type SignupFormValues } from './schemas';
import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [otp, setOtp] = useState('');

  const { control, register, handleSubmit, formState: { errors }, getValues } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      accountType: "client",
    },
  });

  useEffect(() => {
    if (!auth) return; // Ensure auth is initialized

    if (!recaptchaVerifierRef.current && document.getElementById('recaptcha-container-signup')) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log("reCAPTCHA solved (useEffect setup)");
        },
        'expired-callback': () => {
          toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive" });
          setIsLoading(false);
          recaptchaVerifierRef.current?.clear();
          recaptchaVerifierRef.current = null;
        }
      });

      verifier.render()
        .then(() => {
          recaptchaVerifierRef.current = verifier;
          console.log("reCAPTCHA rendered and ref set (useEffect)");
        })
        .catch((error: any) => {
          console.error("Initial RecaptchaVerifier render error:", error);
          toast({
              title: "reCAPTCHA Error",
              description: "Could not initialize reCAPTCHA. Ensure your domain is authorized in Firebase settings & refresh.",
              variant: "destructive",
              duration: 10000
          });
        });
    }

     return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
    };
  }, [auth, toast]);


  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);

    let appVerifier = recaptchaVerifierRef.current;

    if (!appVerifier && auth && document.getElementById('recaptcha-container-signup')) {
      console.log("Attempting to initialize reCAPTCHA in onSubmit as it was not ready.");
      try {
        const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
          'size': 'invisible',
          'callback': (response: any) => console.log("reCAPTCHA solved (onSubmit setup)"),
          'expired-callback': () => {
            toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive" });
            setIsLoading(false);
            recaptchaVerifierRef.current?.clear();
            recaptchaVerifierRef.current = null;
          }
        });
        await newVerifier.render();
        recaptchaVerifierRef.current = newVerifier;
        appVerifier = newVerifier;
        console.log("reCAPTCHA initialized in onSubmit.");
      } catch (initError: any) {
        console.error("Failed to initialize reCAPTCHA in onSubmit:", initError);
        toast({
          title: "reCAPTCHA Error",
          description: "Could not prepare reCAPTCHA. Please refresh the page.",
          variant: "destructive",
          duration: 7000
        });
        setIsLoading(false);
        return;
      }
    }

    if (!appVerifier) {
      toast({
          title: "reCAPTCHA Error",
          description: "reCAPTCHA not initialized. Please wait or refresh. Ensure your domain is authorized in Firebase.",
          variant: "destructive",
          duration: 10000
        });
      setIsLoading(false);
      return;
    }

    if (!otpSent) {
      try {
        const confirmation = await signInWithPhoneNumber(auth, data.phoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        toast({ title: "OTP Sent", description: `An OTP has been sent to ${data.phoneNumber}.` });
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error sending OTP for signup:", error);
        let errorMessage = error.message || "Please check the phone number and try again.";
        if (error.code === 'auth/captcha-check-failed') {
            errorMessage = "reCAPTCHA verification failed. Ensure domain is authorized in Firebase and try again.";
        } else if (error.code === 'auth/invalid-phone-number') {
            errorMessage = "The phone number you entered is invalid. Please check and try again.";
        } else if (error.code === 'auth/invalid-recaptcha-token') {
            errorMessage = "reCAPTCHA token was invalid. Please try sending the OTP again.";
        }  else if (error.code === 'auth/missing-client-identifier') {
            errorMessage = "reCAPTCHA challenge not solved or client identifier missing. Please try again.";
        }


        toast({
            title: "Failed to Send OTP",
            description: errorMessage,
            variant: "destructive",
            duration: 10000
        });

        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
        setIsLoading(false);
      }
    } else {
      if (!confirmationResult) {
        toast({ title: "Verification Error", description: "OTP confirmation context lost. Please try sending OTP again.", variant: "destructive" });
        setOtpSent(false); // Allow resending OTP
        setIsLoading(false);
        return;
      }
      try {
        const userCredential = await confirmationResult.confirm(otp);
        const firebaseUser = userCredential.user;

        if (firebaseUser && firebaseUser.uid) {
          const currentFormData = getValues();
          const result = await signupUserAction(currentFormData, firebaseUser.uid);
          if (result.success) {
            toast({
              title: "Account Created Successfully!",
              description: "Your FundiConnect account has been created.",
              variant: "default",
            });
            router.push(currentFormData.accountType === 'provider' ? `/providers/${result.firebaseUserId}?setup=true` : '/');
          } else {
            toast({
              title: "Profile Creation Failed",
              description: result.message,
              variant: "destructive",
            });
          }
        } else {
          throw new Error("Failed to get user details after OTP confirmation.");
        }
      } catch (error: any) {
        console.error("Error verifying OTP or creating profile:", error);
        let errorMessage = error.message || "Please check the OTP and try again.";
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = "The OTP you entered is incorrect. Please check and try again.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "The OTP has expired. Please request a new one.";
        }
        toast({
            title: "OTP Verification Failed",
            description: errorMessage,
            variant: "destructive",
            duration: 7000
        });
      } finally {
        setIsLoading(false);
      }
    }
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
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="fullName" {...register("fullName")} placeholder="John Doe" className="pl-10" />
                  </div>
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phoneNumber" type="tel" {...register("phoneNumber")} placeholder="+254 7XX XXX XXX" className="pl-10" />
                  </div>
                  {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
                </div>

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
                          <Label htmlFor="client" className="font-normal">I need a service (Client)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="provider" id="provider" />
                          <Label htmlFor="provider" className="font-normal">I offer a service (Fundi)</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                  {errors.accountType && <p className="text-sm text-destructive">{errors.accountType.message}</p>}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                 <p className="text-sm text-muted-foreground">
                  An OTP was sent to {getValues("phoneNumber")}.
                </p>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  required
                  className="text-center tracking-widest text-lg"
                  maxLength={6}
                />
              </div>
            )}

            <div id="recaptcha-container-signup"></div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Processing..." : (otpSent ? "Verify OTP & Sign Up" : "Send OTP")}
            </Button>

            {otpSent && (
              <Button variant="link" size="sm" onClick={() => {setOtpSent(false); setIsLoading(false); setConfirmationResult(null); setOtp('');}} className="w-full text-primary">
                Change phone number or resend OTP
              </Button>
            )}
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
