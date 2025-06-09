
"use client";

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailQuestion, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    // Reset emailSent state in case user tries again with a different email after a success/failure
    // setEmailSent(false); // Actually, let's keep emailSent true once successful to avoid resubmitting the form for the same session.

    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox (and spam folder) for a link to reset your password.",
      });
      setEmailSent(true); // Keep the form hidden after successful submission
    } catch (error: any) { // Ensure the opening brace is here
      console.error("Error sending password reset email:", error);
      let errorMessage = "Failed to send password reset email. Please try again.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No user found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "The email address is not valid.";
      } else if (error.code === 'auth/missing-email') {
        errorMessage = "Please enter an email address.";
      } else if (error.code) {
        // Use Firebase's error message if available and somewhat user-friendly
        errorMessage = error.message.replace('Firebase: ', '').split(' (auth/')[0];
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      setEmailSent(false); // Allow user to try again if there was an error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <MailQuestion className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Forgot Password?</CardTitle>
          <CardDescription>
            {emailSent
              ? "If an account exists for the email provided, a password reset link has been sent. Please check your inbox (and spam folder)."
              : "Enter your email address below and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        {!emailSent ? (
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...</>
                ) : "Send Reset Link"}
              </Button>
              <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
                If you don&apos;t receive an email within a few minutes, please ensure you entered the correct email address and check your spam folder.
            </div>
             <CardFooter className="flex justify-center mt-6">
                <Button variant="outline" asChild>
                <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Link>
                </Button>
          </CardFooter>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
