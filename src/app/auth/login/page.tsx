
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Phone, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    if (!recaptchaVerifierRef.current && auth) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
        'size': 'invisible',
        'callback': (response: any) => console.log("reCAPTCHA solved for login"),
        'expired-callback': () => {
          toast({ title: "reCAPTCHA Expired", description: "Please try again.", variant: "destructive" });
          setIsLoading(false); // Ensure loading state is reset
        }
      });
      recaptchaVerifierRef.current.render().catch((error: any) => {
        console.error("Login RecaptchaVerifier render error:", error);
        toast({
            title: "reCAPTCHA Error",
            description: "Could not initialize reCAPTCHA. Ensure your domain is authorized in Firebase settings & refresh.",
            variant: "destructive",
            duration: 10000
        });
        setIsLoading(false);
      });
    }
     return () => {
      const verifier = recaptchaVerifierRef.current;
      if (verifier) {
        verifier.clear(); // Clear the existing verifier on component unmount
        recaptchaVerifierRef.current = null;
      }
    };
  }, [auth, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!recaptchaVerifierRef.current) {
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
        const appVerifier = recaptchaVerifierRef.current;
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        toast({ title: "OTP Sent", description: `An OTP has been sent to ${phoneNumber}.` });
        setIsLoading(false); // OTP sent, stop loading for this stage
      } catch (error: any) {
        console.error("Error sending OTP for login:", error);
        let errorMessage = error.message || "Please check the phone number and try again.";
        if (error.code === 'auth/captcha-check-failed') {
            errorMessage = "reCAPTCHA verification failed. Please ensure your app's domain is authorized in Firebase Authentication settings and try again.";
        } else if (error.code === 'auth/invalid-phone-number') {
            errorMessage = "The phone number you entered is invalid. Please check and try again.";
        } else if (error.code === 'auth/invalid-recaptcha-token') {
            errorMessage = "reCAPTCHA token was invalid. Please try sending the OTP again.";
        }

        toast({
            title: "Failed to Send OTP",
            description: errorMessage,
            variant: "destructive",
            duration: 10000
        });

        const currentVerifier = recaptchaVerifierRef.current;
        if (currentVerifier) {
            currentVerifier.clear();
             recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
                'size': 'invisible',
                'callback': () => {},
                'expired-callback': () => {}
            });
            recaptchaVerifierRef.current.render()
              .catch(renderError => {
                  console.error("Failed to re-render reCAPTCHA after OTP send error:", renderError);
                  toast({ title: "reCAPTCHA Re-init Error", description: "Could not reset reCAPTCHA. Please refresh.", variant: "destructive" });
              })
              .finally(() => {
                setIsLoading(false);
              });
        } else {
            setIsLoading(false);
        }
      }
    } else {
      if (!confirmationResult) {
        toast({ title: "Verification Error", description: "OTP confirmation context lost. Please try sending OTP again.", variant: "destructive" });
        setOtpSent(false);
        setIsLoading(false);
        return;
      }
      try {
        const userCredential = await confirmationResult.confirm(otp);
        toast({ title: "Login Successful!", description: "Welcome back!", variant: "default" });
        router.push('/');
        console.log("Logged in user:", userCredential.user);
      } catch (error: any) {
        console.error("Error verifying OTP for login:", error);
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

            <div id="recaptcha-container-login"></div>

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
