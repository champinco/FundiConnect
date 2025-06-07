
import { z } from 'zod';

export const signupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  accountType: z.enum(['client', 'provider']),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;
