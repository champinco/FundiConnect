
"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Phone, User, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
// import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  // const [otp, setOtp] = useState('');
  // const [otpSent, setOtpSent] = useState(false);
  // const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  // const recaptchaVerifierRef = useRef<any>(null);
  const { toast } = useToast();

  // useEffect(() => {
  //   if (!recaptchaVerifierRef.current && auth) {
  //     recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
  //       'size': 'invisible',
  //       'callback': (response: any) => console.log("reCAPTCHA solved for login"),
  //       'expired-callback': () => toast({ title: "reCAPTCHA Expired", description: "Please try again.", variant: "destructive" })
  //     });
  //     recaptchaVerifierRef.current.render().catch((error: any) => {
  //       console.error("Login RecaptchaVerifier render error:", error);
  //       toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Refresh and try again.", variant: "destructive"});
  //     });
  //   }
  // }, [auth, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement Firebase Phone Authentication Login Flow
    // 1. If !otpSent: Send OTP to phoneNumber using signInWithPhoneNumber. Store confirmationResult. Set otpSent(true).
    // 2. If otpSent: User enters OTP, call confirmationResult.confirm(otp).
    // 3. On success, redirect user or manage session.
    
    toast({
        title: "Phone Auth Not Implemented",
        description: "Firebase phone authentication (OTP) login flow needs to be implemented.",
        variant: "destructive"
    });
    console.warn("Placeholder: Firebase Phone Login flow starts here with phone:", phoneNumber);
    
    setIsLoading(false);
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
             <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                <AlertTriangle className="h-4 w-4 !text-yellow-700" />
              <AlertDescription>
                Phone authentication (OTP flow) is not yet fully implemented. This form is a placeholder.
              </AlertDescription>
            </Alert>
            
            {/* {!otpSent ? ( */}
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
            {/* ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input 
                  id="otp" 
                  type="text" 
                  placeholder="6-digit code" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            )} */}

            {/* This div is for the invisible reCAPTCHA */}
            <div id="recaptcha-container-login"></div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Processing..." : (
                <> <LogIn className="mr-2 h-4 w-4" /> Log In / Send OTP</>
              )}
            </Button>
            
            <div className="relative hidden"> {/* Hide Google login */}
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full hidden"> {/* Hide Google login */}
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
              Google
            </Button>
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
