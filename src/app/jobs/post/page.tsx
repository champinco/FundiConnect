
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Briefcase, Send, Loader2, Paperclip, DollarSign, AlertTriangle } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { useToast } from "@/hooks/use-toast";
import { postJobAction } from '../actions'; // Updated import path
import { postJobFormSchema, type PostJobFormValues, jobUrgenciesForValidation, serviceCategoriesForValidation } from './schemas';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, analytics } from '@/lib/firebase'; // Added analytics
import { logEvent } from 'firebase/analytics'; // Added logEvent
import { uploadFileToStorage } from '@/services/storageService';
import type { JobUrgency } from '@/models/job';


// All service categories for the dropdown if needed, or keep it focused on Tier 1
const allServiceCategories: ServiceCategory[] = [...serviceCategoriesForValidation];


export default function PostJobPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // User is not logged in, redirect them or show a message
        // For now, the onSubmit will handle this, but you might want an earlier check
      }
    });
    return () => unsubscribe();
  }, []);

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobFormSchema),
    defaultValues: {
      jobTitle: "",
      serviceCategory: "Other",
      jobDescription: "",
      location: "",
      budget: undefined,
      urgency: "medium",
      postingOption: "public",
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files).slice(0, 5); // Limit to 5 files
      // You might want to add file size validation here per file
      setSelectedFiles(filesArray);
    }
  };

  const onSubmit = async (data: PostJobFormValues) => {
    // Debugging logs as requested
    console.log('Auth state before job post attempt:', {
      user: !!currentUser,
      uid: currentUser?.uid,
      email: currentUser?.email
    });

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to post a job.",
        variant: "destructive",
      });
      router.push('/auth/login?redirect=/jobs/post');
      return;
    }

    setIsLoading(true);
    let uploadedPhotoUrls: string[] = [];

    if (selectedFiles.length > 0) {
      try {
        const uploadPromises = selectedFiles.map(file =>
          uploadFileToStorage(file, `jobs/${currentUser.uid}/attachments`)
        );
        uploadedPhotoUrls = await Promise.all(uploadPromises);
      } catch (uploadError: any) {
        toast({
          title: "File Upload Failed",
          description: uploadError.message || "Could not upload one or more files. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      // Ensure budget and urgency are correctly passed (they are already part of 'data' due to form structure)
      const result = await postJobAction(data, currentUser.uid, uploadedPhotoUrls);
      if (result.success && result.jobId) {
        toast({
          title: "Job Posted!",
          description: "Your job has been successfully posted.",
        });
        if (analytics) {
          logEvent(analytics, 'post_job', { // Custom event name
            job_id: result.jobId,
            category: data.serviceCategory,
            location: data.location,
            user_id: currentUser.uid,
            budget: data.budget,
            urgency: data.urgency,
          });
        }
        reset();
        setSelectedFiles([]);
        router.push(`/jobs/${result.jobId}`);
      } else {
        toast({
          title: "Failed to Post Job",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Post a New Job</CardTitle>
          </div>
          <CardDescription>
            Describe the service you need, and our Fundis will get in touch with quotes.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="jobTitle" className="font-semibold">Job Title</Label>
              <Input
                id="jobTitle"
                {...register("jobTitle")}
                placeholder="e.g., Fix Leaking Kitchen Tap, Install New Ceiling Fans"
                className="mt-1"
              />
              {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
            </div>

            <div>
              <Label htmlFor="serviceCategory" className="font-semibold">Service Category</Label>
              <Controller
                name="serviceCategory"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="serviceCategory" className="mt-1">
                      <SelectValue placeholder="Select a service category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allServiceCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center">
                            <ServiceCategoryIcon category={category} iconOnly className="mr-2 h-4 w-4" />
                            {category}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.serviceCategory && <p className="text-sm text-destructive mt-1">{errors.serviceCategory.message}</p>}
            </div>

            <div>
              <Label htmlFor="jobDescription" className="font-semibold">Detailed Description</Label>
              <Textarea
                id="jobDescription"
                {...register("jobDescription")}
                placeholder="Provide as much detail as possible. What needs to be done? What is the problem? Any specific requirements?"
                className="min-h-[150px] mt-1"
              />
              {errors.jobDescription && <p className="text-sm text-destructive mt-1">{errors.jobDescription.message}</p>}
            </div>

            <div>
              <Label htmlFor="location" className="font-semibold">Location of Job</Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="e.g., Kilimani, Nairobi (Specific address if comfortable)"
                className="mt-1"
              />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="budget" className="font-semibold flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-primary" /> Budget (Optional, KES)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  {...register("budget")}
                  placeholder="e.g., 5000"
                  className="mt-1"
                />
                {errors.budget && <p className="text-sm text-destructive mt-1">{errors.budget.message}</p>}
              </div>
              <div>
                <Label htmlFor="urgency" className="font-semibold flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-primary"/> Urgency (Optional)
                </Label>
                <Controller
                    name="urgency"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined} >
                        <SelectTrigger id="urgency" className="mt-1">
                        <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="low">Low - Within a few days/weeks</SelectItem>
                        <SelectItem value="medium">Medium - Within a day or two</SelectItem>
                        <SelectItem value="high">High - Urgent / ASAP</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.urgency && <p className="text-sm text-destructive mt-1">{errors.urgency.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="jobUpload" className="font-semibold">Upload Photos/Videos (Optional)</Label>
              <div className="mt-1 flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">Up to 5 files (PNG, JPG, MP4, etc.)</p>
                      </div>
                      <Input id="dropzone-file" type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*,video/*" />
                  </label>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {selectedFiles.map(file => <li key={file.name} className="truncate">{file.name} ({ (file.size / 1024 / 1024).toFixed(2) } MB)</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Attach images or short videos of the problem area. This helps Fundis understand the job better.</p>
            </div>

            <div>
              <Label htmlFor="postingOption" className="font-semibold">Posting Option</Label>
              <Controller
                name="postingOption"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} defaultValue="public">
                    <SelectTrigger id="postingOption" className="mt-1">
                      <SelectValue placeholder="Select posting option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public Post (Notify relevant Fundis)</SelectItem>
                      <SelectItem value="direct" disabled>Direct Post (Select specific Fundis - feature coming soon)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.postingOption && <p className="text-sm text-destructive mt-1">{errors.postingOption.message}</p>}
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting Job...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Post Job</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
