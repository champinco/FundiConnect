
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'; // Added Eye, EyeOff
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, analytics } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import Link from 'next/link';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !isLoading) {
        const redirectUrl = searchParams.get('redirect');
        router.push(redirectUrl || '/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router, searchParams, isLoading]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Login Successful!", description: "Redirecting to your dashboard..." });
      if (analytics) {
        logEvent(analytics, 'login', { method: 'email' });
      }
    } catch (error: any) {
      console.error("Error logging in:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";

      // Check for our custom blocking function error first
      if (error.code === 'auth/functions-unauthenticated' && error.message.toLowerCase().includes("verify your email")) {
        errorMessage = "Please verify your email before signing in. Check your inbox for a verification link.";
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Access to this account has been temporarily disabled due to many failed login attempts. You can reset your password or try again later.";
      } else {
        // Fallback for other Firebase errors
        errorMessage = error.message.replace('Firebase: ', '').split(' (auth/')[0];
      }
      
      toast({ title: "Login Error", description: errorMessage, variant: "destructive" });
      setIsLoading(false);
    }
  };

  if (currentUser && !isLoading) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">You are already logged in. Redirecting...</p>
            </Card>
          </div>
      );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <LogIn className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-3xl font-headline">Login to FundiConnect</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="email" className="font-semibold flex items-center">
              <Mail className="mr-2 h-4 w-4" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="e.g., user@example.com"
              className="mt-1"
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password" className="font-semibold flex items-center">
              <KeyRound className="mr-2 h-4 w-4" /> Password
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Enter your password"
                className="pr-10" // Add padding for the icon
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-primary"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-1">
              {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : <span />}
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline hover:text-primary/80">Forgot password?</Link>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : "Login"}
          </Button>
           <p className="text-xs text-muted-foreground mt-4 text-center">
              Don&apos;t have an account? <a href="/auth/signup" className="text-primary hover:underline hover:text-primary/80">Sign up here</a>.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  const SuspenseFallback = (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Suspense fallback={SuspenseFallback}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
