
import { z } from 'zod';

export const signupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
  accountType: z.enum(['client', 'provider']),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // path of error
});

export type SignupFormValues = Omit<z.infer<typeof signupFormSchema>, 'confirmPassword'>;
