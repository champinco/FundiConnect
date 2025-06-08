
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Phone, MessageSquareText, User, Briefcase, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, type ConfirmationResult, type User as FirebaseUser } from 'firebase/auth';
import { signupUserAction } from './actions';
import { signupFormSchema, type SignupFormValues } from './schemas';

const containerId = 'recaptcha-container-signup';

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [formValues, setFormValues] = useState<Partial<SignupFormValues>>({});


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // If user is already signed up and verified, maybe redirect or show a message.
        // For now, if a user object exists, we assume they might be in the process of OTP verification for signup
      }
    });
    return () => unsubscribe();
  }, [router]);

  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<SignupFormValues & { otp?: string }>({
    resolver: zodResolver(signupFormSchema.extend({ otp: z.string().optional() })),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      accountType: "client",
      otp: "",
    },
  });
  
  const watchedPhoneNumber = watch("phoneNumber");
  const watchedFullName = watch("fullName");
  const watchedAccountType = watch("accountType");


  const initializeRecaptcha = () => {
    if (document.getElementById(containerId) && !recaptchaVerifierRef.current && auth) {
        const verifier = new RecaptchaVerifier(auth, containerId, {
            'size': 'invisible',
            'callback': (response: any) => { /* reCAPTCHA solved */ },
            'expired-callback': () => {
                toast({ title: "reCAPTCHA Expired", description: "Please try sending the OTP again.", variant: "destructive" });
                recaptchaVerifierRef.current?.clear();
                initializeRecaptcha();
            }
        });
        recaptchaVerifierRef.current = verifier;
    }
  };

  useEffect(() => {
    initializeRecaptcha();
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const onSubmit = async (data: SignupFormValues & { otp?: string }) => {
    setIsLoading(true);
    setFormValues(data); // Store form values for use after OTP verification

    let appVerifier = recaptchaVerifierRef.current;
    if (!appVerifier) {
        if (document.getElementById(containerId)){
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
        console.error("Error sending OTP (Signup):", error);
         if (error.code === 'auth/too-many-requests') {
             toast({ title: "Error", description: "Too many OTP requests. Please try again later.", variant: "destructive" });
        } else if (error.code === 'auth/invalid-phone-number') {
             toast({ title: "Error", description: "Invalid phone number provided. Please check and try again.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: error.message || "Failed to send OTP. Ensure reCAPTCHA is verified.", variant: "destructive" });
        }
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
        const userCredential = await confirmationResult.confirm(data.otp);
        const firebaseUser = userCredential.user;
        toast({ title: "OTP Verified!", description: "Creating your account..." });

        // Now call the server action to create Firestore profiles
        const signupResult = await signupUserAction(
          { fullName: data.fullName, phoneNumber: data.phoneNumber, accountType: data.accountType },
          firebaseUser.uid
        );

        if (signupResult.success) {
          toast({ title: "Account Created!", description: "Welcome to FundiConnect!" });
          router.push('/'); // Redirect to home or dashboard
        } else {
          toast({ title: "Signup Failed", description: signupResult.message, variant: "destructive" });
        }
      } catch (error: any) {
        console.error("Error verifying OTP or creating profile (Signup):", error);
        if (error.code === 'auth/invalid-verification-code') {
            toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
        } else if (error.code === 'auth/code-expired') {
            toast({ title: "Error", description: "OTP has expired. Please request a new one.", variant: "destructive" });
            setOtpSent(false); 
        } else if (error.code === 'auth/too-many-requests') {
            toast({ title: "Error", description: "Too many OTP verification attempts. Please try again later or request a new OTP.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: error.message || "Failed to verify OTP or create account.", variant: "destructive" });
        }
      }
    }
    setIsLoading(false);
  };
  
  const canSendOtp = watchedFullName && watchedPhoneNumber && watchedAccountType;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>
            {otpSent ? "Enter the OTP sent to your phone to complete signup." : "Join FundiConnect by providing your details."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <>
                <div>
                  <Label htmlFor="fullName" className="font-semibold flex items-center"><User className="mr-2 h-4 w-4" /> Full Name</Label>
                  <Input id="fullName" {...register("fullName")} placeholder="e.g., Juma Otieno" className="mt-1" disabled={isLoading} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="font-semibold flex items-center"><Phone className="mr-2 h-4 w-4" /> Phone Number</Label>
                  <Input id="phoneNumber" type="tel" {...register("phoneNumber")} placeholder="e.g., +254712345678 or 0712345678" className="mt-1" disabled={isLoading} />
                  {errors.phoneNumber && <p className="text-sm text-destructive mt-1">{errors.phoneNumber.message}</p>}
                </div>
                <div>
                  <Label className="font-semibold flex items-center mb-1"><Briefcase className="mr-2 h-4 w-4" /> Account Type</Label>
                  <Controller
                    name="accountType"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
              </>
            ) : (
              <div>
                <p className="text-sm text-center mb-2">Verifying for: <span className="font-medium">{formValues.fullName}</span> (<span className="font-medium">{formValues.phoneNumber}</span>) as a <span className="font-medium">{formValues.accountType}</span>.</p>
                <Label htmlFor="otp" className="font-semibold flex items-center"><MessageSquareText className="mr-2 h-4 w-4" /> OTP Code</Label>
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
                    Re-enter details or change phone number?
                </Button>
              </div>
            )}
            <div id={containerId}></div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || (!otpSent && !canSendOtp)}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (otpSent ? "Verify OTP & Sign Up" : "Send OTP")}
            </Button>
             {!otpSent && <p className="text-xs text-muted-foreground mt-4 text-center">We'll send an OTP to verify your phone number. Standard message and data rates may apply.</p>}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
