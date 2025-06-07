
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
          setIsLoading(false);
        }
      });
      recaptchaVerifierRef.current.render().catch((error: any) => {
        console.error("Login RecaptchaVerifier render error:", error);
        toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Refresh and try again.", variant: "destructive"});
        setIsLoading(false);
      });
    }
     return () => {
      if (recaptchaVerifierRef.current) {
        // No direct 'destroy' or 'clear' method. Firebase handles this.
      }
    };
  }, [auth, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!recaptchaVerifierRef.current) {
      toast({ title: "reCAPTCHA Error", description: "reCAPTCHA not initialized. Please wait or refresh.", variant: "destructive" });
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
      } catch (error: any) {
        console.error("Error sending OTP for login:", error);
         if (recaptchaVerifierRef.current) { // Attempt to reset reCAPTCHA
            recaptchaVerifierRef.current.clear();
             recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
                'size': 'invisible',
                'callback': () => {},
                'expired-callback': () => {}
            });
            recaptchaVerifierRef.current.render().catch(console.error);
        }
        toast({ title: "Failed to Send OTP", description: error.message || "Please check the phone number and try again.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else { // OTP has been sent, now verify it
      if (!confirmationResult) {
        toast({ title: "Verification Error", description: "OTP confirmation context lost. Please try sending OTP again.", variant: "destructive" });
        setOtpSent(false);
        setIsLoading(false);
        return;
      }
      try {
        const userCredential = await confirmationResult.confirm(otp);
        // Handle successful login
        toast({ title: "Login Successful!", description: "Welcome back!", variant: "default" });
        // TODO: Redirect user or manage session (e.g., using a global state/context)
        // For now, just redirect to home page.
        router.push('/'); 
        console.log("Logged in user:", userCredential.user);
      } catch (error: any) {
        console.error("Error verifying OTP for login:", error);
        toast({ title: "OTP Verification Failed", description: error.message || "Please check the OTP and try again.", variant: "destructive" });
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
