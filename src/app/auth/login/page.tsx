
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, KeyRound, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, analytics } from '@/lib/firebase'; // Added analytics
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { logEvent } from 'firebase/analytics'; // Added logEvent
import Link from 'next/link'; 

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const redirectUrl = searchParams.get('redirect');
        if (redirectUrl) {
            router.push(redirectUrl);
        } else {
            router.push('/dashboard'); // Default to dashboard if logged in
        }
      }
    });
    return () => unsubscribe();
  }, [router, searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Login Successful!", description: "Redirecting to your dashboard..." });
      if (analytics) {
        logEvent(analytics, 'login', { method: 'email' }); // Standard Firebase event
      }
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Error logging in:", error);
      let errorMessage = "Failed to login. Please check your credentials and try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.code) {
        errorMessage = error.message.replace('Firebase: ', '').split(' (auth/')[0];
      }
      toast({ title: "Login Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser && !isLoading) { // Ensure loading is false before showing redirecting message
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">You are already logged in. Redirecting to dashboard...</p>
            </Card>
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
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="Enter your password"
                className="mt-1"
                disabled={isLoading}
              />
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
    </div>
  );
}
