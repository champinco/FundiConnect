
import { z } from 'zod';
import type { ServiceCategory } from '@/components/service-category-icon';
import type { JobUrgency } from '@/models/job';

export const serviceCategoriesForValidation: [ServiceCategory, ...ServiceCategory[]] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Vehicle Mechanics',
  'Garbage Collection',
  'HVAC',
  'Solar Installation',
  'Painting & Decorating',
  'Carpentry & Furniture',
  'Landscaping',
  'Tiling & Masonry',
  'Pest Control',
  'Locksmith',
  'Other'
];

export const jobUrgenciesForValidation: [JobUrgency, ...JobUrgency[]] = ['low', 'medium', 'high'];

export const postJobFormSchema = z.object({
  jobTitle: z.string().min(5, { message: "Job title must be at least 5 characters." }).max(100),
  serviceCategory: z.string().min(3, { message: "Service category is required (min 3 characters)." }),
  jobDescription: z.string().min(20, { message: "Description must be at least 20 characters." }).max(2000),
  location: z.string().min(3, { message: "Location is required." }).max(100),
  budget: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() !== '' ? Number(val.replace(/,/g, '')) : (typeof val === 'number' ? val : undefined)),
    z.number().positive("Budget must be a positive number.").optional().nullable()
  ),
  urgency: z.enum(jobUrgenciesForValidation, { errorMap: () => ({ message: "Please select the urgency level."})}).default('medium'),
  deadline: z.date().optional().nullable(),
  postingOption: z.enum(['public', 'direct']).default('public'),
});

export type PostJobFormValues = z.infer<typeof postJobFormSchema>;
