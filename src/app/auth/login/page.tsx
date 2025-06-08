
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Phone, MessageSquareText, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, type ConfirmationResult, type User as FirebaseUser, PhoneAuthProvider } from 'firebase/auth';

const loginFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid Kenya phone number format. Start with +254 or 0." }),
  otp: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const containerId = 'recaptcha-container-login';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const redirectUrl = searchParams.get('redirect') || '/';
        router.push(redirectUrl);
      }
    });
    return () => unsubscribe();
  }, [router, searchParams]);

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      phoneNumber: "",
      otp: "",
    },
  });

  const phoneNumberValue = watch("phoneNumber");

  const initializeRecaptcha = () => {
    if (document.getElementById(containerId) && !recaptchaVerifierRef.current && auth) {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast({ title: "reCAPTCHA Expired", description: "Please try sending the OTP again.", variant: "destructive" });
          recaptchaVerifierRef.current?.clear(); // Clear the existing verifier
          initializeRecaptcha(); // Re-initialize
        }
      });
      recaptchaVerifierRef.current = verifier;
    }
  };
  
  useEffect(() => {
    initializeRecaptcha();
     // Cleanup on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);


  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    let appVerifier = recaptchaVerifierRef.current;
    if (!appVerifier) {
        if (document.getElementById(containerId)) {
            const verifier = new RecaptchaVerifier(auth, containerId, {
                'size': 'invisible',
                'callback': (response: any) => {},
                'expired-callback': () => {
                    toast({ title: "reCAPTCHA Expired", description: "Please verify reCAPTCHA and try again.", variant: "destructive" });
                }
            });
            recaptchaVerifierRef.current = verifier;
            appVerifier = verifier;
        } else {
            toast({ title: "Error", description: "reCAPTCHA container not found.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
    }

    if (!otpSent) {
      try {
        const formattedPhoneNumber = data.phoneNumber.startsWith('+') ? data.phoneNumber : `+254${data.phoneNumber.substring(1)}`;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        toast({ title: "OTP Sent", description: `An OTP has been sent to ${formattedPhoneNumber}.` });
      } catch (error: any) {
        console.error("Error sending OTP:", error);
        if (error.code === 'auth/too-many-requests') {
             toast({ title: "Error", description: "Too many OTP requests. Please try again later.", variant: "destructive" });
        } else if (error.code === 'auth/invalid-phone-number') {
             toast({ title: "Error", description: "Invalid phone number provided. Please check and try again.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: error.message || "Failed to send OTP. Ensure reCAPTCHA is verified.", variant: "destructive" });
        }
        // Reset reCAPTCHA to allow retrying
        recaptchaVerifierRef.current?.render().then(widgetId => {
            // @ts-ignore
            window.grecaptcha.reset(widgetId);
        });
      }
    } else {
      if (!confirmationResult || !data.otp) {
        toast({ title: "Error", description: "OTP is required.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      try {
        await confirmationResult.confirm(data.otp);
        toast({ title: "Login Successful!", description: "You are now logged in." });
        const redirectUrl = searchParams.get('redirect') || '/';
        router.push(redirectUrl);
      } catch (error: any) {
        console.error("Error verifying OTP:", error);
        if (error.code === 'auth/invalid-verification-code') {
            toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
        } else if (error.code === 'auth/code-expired') {
            toast({ title: "Error", description: "OTP has expired. Please request a new one.", variant: "destructive" });
            setOtpSent(false); // Allow resending OTP
        } else if (error.code === 'auth/too-many-requests') {
            toast({ title: "Error", description: "Too many OTP verification attempts. Please try again later or request a new OTP.", variant: "destructive" });
        }
        else {
            toast({ title: "Error", description: error.message || "Failed to verify OTP.", variant: "destructive" });
        }
      }
    }
    setIsLoading(false);
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
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <LogIn className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Login to FundiConnect</CardTitle>
          <CardDescription>
            {otpSent ? "Enter the OTP sent to your phone." : "Enter your phone number to receive an OTP."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <div>
                <Label htmlFor="phoneNumber" className="font-semibold flex items-center">
                  <Phone className="mr-2 h-4 w-4" /> Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register("phoneNumber")}
                  placeholder="e.g., +254712345678 or 0712345678"
                  className="mt-1"
                  disabled={isLoading}
                />
                {errors.phoneNumber && <p className="text-sm text-destructive mt-1">{errors.phoneNumber.message}</p>}
              </div>
            ) : (
              <div>
                <Label htmlFor="otp" className="font-semibold flex items-center">
                  <MessageSquareText className="mr-2 h-4 w-4" /> OTP Code
                </Label>
                <Controller
                  name="otp"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="otp"
                      type="text"
                      {...field}
                      placeholder="Enter 6-digit OTP"
                      className="mt-1 tracking-[0.3em] text-center"
                      maxLength={6}
                      disabled={isLoading}
                    />
                  )}
                />
                {errors.otp && <p className="text-sm text-destructive mt-1">{errors.otp.message}</p>}
                 <Button variant="link" size="sm" onClick={() => { setOtpSent(false); setConfirmationResult(null); }} className="mt-1 px-0 h-auto" disabled={isLoading}>
                    Change phone number?
                </Button>
              </div>
            )}
            <div id={containerId}></div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || (!otpSent && !phoneNumberValue)}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (otpSent ? "Verify OTP & Login" : "Send OTP")}
            </Button>
             {!otpSent && <p className="text-xs text-muted-foreground mt-4 text-center">We'll send an OTP to verify your phone number. Standard message and data rates may apply.</p>}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
