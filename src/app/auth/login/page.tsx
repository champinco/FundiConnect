
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

const containerId = 'recaptcha-container-login';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) return;

    if (!recaptchaVerifierRef.current && document.getElementById(containerId)) {
      console.log("Attempting to initialize reCAPTCHA in useEffect (Login)");
      try {
        const verifier = new RecaptchaVerifier(auth, containerId, {
          'size': 'invisible',
          'callback': (response: any) => {
            console.log("reCAPTCHA solved (useEffect setup - Login)");
          },
          'expired-callback': () => {
            toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive" });
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
              console.log("reCAPTCHA expired and verifier cleared (Login).");
            }
            setIsLoading(false);
          }
        });
        verifier.render()
          .then(() => {
            recaptchaVerifierRef.current = verifier;
            console.log("reCAPTCHA rendered and ref set (useEffect - Login)");
          })
          .catch((error: any) => {
            console.error("Initial RecaptchaVerifier render error (Login useEffect):", error);
            toast({
                title: "reCAPTCHA Error",
                description: "Could not initialize reCAPTCHA. Ensure your domain is authorized in Firebase settings & refresh.",
                variant: "destructive",
                duration: 10000
            });
            recaptchaVerifierRef.current = null;
          });
      } catch (error) {
         console.error("Error creating RecaptchaVerifier instance (Login useEffect):", error);
         toast({
            title: "reCAPTCHA Setup Failed",
            description: "Could not create reCAPTCHA verifier. Please refresh.",
            variant: "destructive",
        });
      }
    }
     return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
        console.log("reCAPTCHA cleared on unmount (Login)");
      }
    };
  }, [auth, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    let appVerifier = recaptchaVerifierRef.current;

    if (!appVerifier) {
      console.log("recaptchaVerifierRef is null in handleLogin, attempting to initialize (Login).");
      if (document.getElementById(containerId)) {
        try {
          const verifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible',
            'callback': (response: any) => console.log("reCAPTCHA solved (handleLogin init - Login)"),
            'expired-callback': () => {
              toast({ title: "reCAPTCHA Expired", description: "Please try sending OTP again.", variant: "destructive" });
              if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
                recaptchaVerifierRef.current = null;
                console.log("reCAPTCHA expired and verifier cleared (handleLogin init - Login).");
              }
              setIsLoading(false);
            }
          });
          await verifier.render();
          recaptchaVerifierRef.current = verifier;
          appVerifier = verifier;
          console.log("reCAPTCHA initialized and rendered in handleLogin (Login).");
        } catch (error: any) {
          console.error("Error initializing reCAPTCHA in handleLogin (Login):", error);
          toast({
            title: "reCAPTCHA Initialization Failed",
            description: "Could not set up reCAPTCHA. Please try again or refresh.",
            variant: "destructive",
            duration: 7000
          });
          setIsLoading(false);
          return;
        }
      } else {
         toast({ title: "Error", description: "reCAPTCHA container not found. Please refresh.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }
    
    if (!otpSent) {
      try {
        console.log("Attempting to send OTP (Login)... Phone:", phoneNumber);
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        toast({ title: "OTP Sent", description: `An OTP has been sent to ${phoneNumber}.` });
      } catch (error: any) {
        let errorMessage = "Failed to send OTP. " + (error.message || "Please check the phone number and try again.");
        if (error.code === 'auth/captcha-check-failed' || error.code === 'auth/invalid-recaptcha-token' || error.code === 'auth/missing-recaptcha-token' || error.code === 'auth/missing-client-identifier') {
          if (error.code === 'auth/captcha-check-failed') errorMessage = "reCAPTCHA verification failed. Ensure domain is authorized in Firebase and try again.";
          else if (error.code === 'auth/invalid-recaptcha-token') errorMessage = "reCAPTCHA token was invalid. Please try sending the OTP again.";
          else if (error.code === 'auth/missing-client-identifier' || error.code === 'auth/missing-recaptcha-token') errorMessage = "reCAPTCHA challenge not solved or client identifier missing. Please try again.";
          
          if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null;
            console.log(`reCAPTCHA verifier cleared due to OTP send error: ${error.code} (Login)`);
          }
        } else if (error.code === 'auth/invalid-phone-number') {
            errorMessage = "The phone number you entered is invalid. Please check and try again.";
        } else if (error.code === 'auth/user-not-found'){
            errorMessage = "No account found with this phone number. Please sign up first.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Too many OTP requests. Please try again later.";
        }
        console.error("Error sending OTP for login:", error, "Code:", error.code);
        toast({
            title: "Failed to Send OTP",
            description: errorMessage,
            variant: "destructive",
            duration: 10000
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!confirmationResult) {
        toast({ title: "Verification Error", description: "OTP confirmation context lost. Please try sending OTP again.", variant: "destructive" });
        setOtpSent(false);
        setIsLoading(false);
        return;
      }
      try {
        console.log("Attempting to verify OTP (Login)... OTP:", otp);
        const userCredential = await confirmationResult.confirm(otp);
        toast({ title: "Login Successful!", description: "Welcome back!", variant: "default" });
        router.push('/');
        console.log("Logged in user:", userCredential.user);
      } catch (error: any) {
        console.error("Error verifying OTP for login:", error, "Code:", error.code);
        let errorMessage = "OTP verification failed. " + (error.message || "Please check the OTP and try again.");
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = "The OTP you entered is incorrect. Please check and try again.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "The OTP has expired. Please request a new one.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Too many OTP verification attempts. Please try again later or request a new OTP.";
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
            <User className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Log in to your FundiConnect account using your phone number.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+254 7XX XXX XXX"
                    className="pl-10"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                 <p className="text-sm text-muted-foreground">
                  An OTP was sent to {phoneNumber}.
                </p>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="text-center tracking-widest text-lg"
                  maxLength={6}
                />
              </div>
            )}

            <div id={containerId}></div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Processing..." : (otpSent ? "Verify OTP & Log In" : "Send OTP")}
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
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

    