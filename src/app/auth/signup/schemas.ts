
import { z } from 'zod';

export const signupFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." })
    .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format." }), // Basic E.164-like regex
  accountType: z.enum(['client', 'provider']),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;
