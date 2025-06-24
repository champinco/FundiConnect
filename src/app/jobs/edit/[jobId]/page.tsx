
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
import { CalendarIcon, Upload, Briefcase, Send, Loader2, AlertTriangle, Clock, XCircle, ArrowLeft } from 'lucide-react'; 
import { useToast } from "@/hooks/use-toast";
import { postJobFormSchema, type PostJobFormValues, jobUrgenciesForValidation, serviceCategoriesForValidation } from '@/app/jobs/post/schemas';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { uploadFileToStorage } from '@/services/storageService';
import type { Job, JobUrgency } from '@/models/job';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'; 
import { Calendar } from '@/components/ui/calendar'; 
import { format } from 'date-fns'; 
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { getJobForEditAction, updateJobAction } from './actions';

export default function EditJobPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';

  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [jobData, setJobData] = useState<Job | null>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string, name: string }[]>([]);

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobFormSchema)
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (jobId) {
          setIsPageLoading(true);
          const result = await getJobForEditAction(jobId);
          if (result.error || !result.job) {
            toast({ title: "Error", description: result.error || "Job not found.", variant: "destructive" });
            router.push('/jobs/my-jobs');
            return;
          }
          if (result.job.clientId !== user.uid) {
            toast({ title: "Unauthorized", description: "You cannot edit this job.", variant: "destructive" });
            router.push('/');
            return;
          }
          setJobData(result.job);
          reset({
            jobTitle: result.job.title,
            serviceCategory: result.job.serviceCategory === 'Other' && result.job.otherCategoryDescription ? result.job.otherCategoryDescription : result.job.serviceCategory,
            jobDescription: result.job.description,
            location: result.job.location,
            budget: result.job.budget || undefined,
            urgency: result.job.urgency || 'medium',
            deadline: result.job.deadline ? new Date(result.job.deadline) : null,
          });
          const initialPreviews = (result.job.photosOrVideos || []).map(url => ({ url, type: 'image', name: url.split('/').pop() || 'image'}));
          setFilePreviews(initialPreviews);
          setIsPageLoading(false);
        }
      } else {
        router.push(`/auth/login?redirect=/jobs/edit/${jobId}`);
      }
    });
    return () => unsubscribe();
  }, [jobId, router, reset, toast]);

  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => {
          if (preview.url.startsWith('blob:')) {
             URL.revokeObjectURL(preview.url);
          }
      });
    };
  }, [filePreviews]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const combinedFiles = [...selectedFiles, ...newFiles].slice(0, 5); 
      setSelectedFiles(combinedFiles);

      const newPreviews = newFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      }));
      setFilePreviews(prev => [...prev, ...newPreviews].slice(0, 5));
    }
  };
  
  const removeFile = (indexToRemove: number, isExisting: boolean) => {
    const previewToRemove = filePreviews[indexToRemove];
    if (previewToRemove?.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewToRemove.url);
    }
    
    if (isExisting) {
        setJobData(prev => prev ? ({ ...prev, photosOrVideos: (prev.photosOrVideos || []).filter((_, i) => i !== indexToRemove - selectedFiles.length) }) : null);
    } else {
        setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    }
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = async (data: PostJobFormValues) => {
    if (!currentUser || !jobId) return;

    setIsLoading(true);
    try {
      let uploadedPhotoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(file =>
          uploadFileToStorage(file, `jobs/${currentUser.uid}/attachments`)
        );
        uploadedPhotoUrls = await Promise.all(uploadPromises);
      }
      
      const existingPhotos = jobData?.photosOrVideos || [];
      const finalPhotoUrls = [...existingPhotos, ...uploadedPhotoUrls];
      
      const result = await updateJobAction(jobId, data, finalPhotoUrls);

      if (result.success) {
        toast({
          title: "Job Updated!",
          description: "Your job has been successfully updated.",
        });
        router.push(`/jobs/${jobId}`);
      } else {
        toast({
          title: "Failed to Update Job",
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

  if (isPageLoading) {
      return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job
      </Button>
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Edit Job</CardTitle>
          </div>
          <CardDescription>
            Update the details of your job posting below.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            {/* Form fields are identical to post/page.tsx, so they are included here */}
             <div>
              <Label htmlFor="jobTitle" className="font-semibold">Job Title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
              {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
            </div>

            <div>
              <Label htmlFor="serviceCategory" className="font-semibold">Service Category</Label>
              <Input id="serviceCategory" {...register("serviceCategory")} list="serviceCategories-datalist" />
              <datalist id="serviceCategories-datalist">
                {serviceCategoriesForValidation.map(category => <option key={category} value={category} />)}
              </datalist>
              {errors.serviceCategory && <p className="text-sm text-destructive mt-1">{errors.serviceCategory.message}</p>}
            </div>

            <div>
              <Label htmlFor="jobDescription" className="font-semibold">Detailed Description</Label>
              <Textarea id="jobDescription" {...register("jobDescription")} className="min-h-[150px] mt-1"/>
              {errors.jobDescription && <p className="text-sm text-destructive mt-1">{errors.jobDescription.message}</p>}
            </div>

            <div>
              <Label htmlFor="location" className="font-semibold">Location of Job</Label>
              <Input id="location" {...register("location")} />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="budget" className="font-semibold">Budget (Optional, KES)</Label>
                <Input id="budget" type="number" {...register("budget")} />
                {errors.budget && <p className="text-sm text-destructive mt-1">{errors.budget.message}</p>}
              </div>
              <div>
                <Label htmlFor="urgency" className="font-semibold">Urgency</Label>
                <Controller
                    name="urgency"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'medium'} >
                        <SelectTrigger><SelectValue placeholder="Select urgency" /></SelectTrigger>
                        <SelectContent>
                          {jobUrgenciesForValidation.map(urgency => (
                            <SelectItem key={urgency} value={urgency} className="capitalize">{urgency}</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.urgency && <p className="text-sm text-destructive mt-1">{errors.urgency.message}</p>}
              </div>
            </div>
            
            <div>
                <Label htmlFor="deadline" className="font-semibold">Preferred Completion Date (Optional)</Label>
                <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={`w-full justify-start text-left font-normal mt-1 ${!field.value && "text-muted-foreground"}`}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } initialFocus/>
                        </PopoverContent>
                    </Popover>
                    )}
                />
                {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline.message}</p>}
            </div>

            <div>
              <Label htmlFor="jobUpload" className="font-semibold">Add or Remove Photos/Videos (up to 5 total)</Label>
              <div className="mt-1">
                <Input id="jobUpload" type="file" multiple onChange={handleFileChange} accept="image/*,video/*" />
              </div>
              {filePreviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{filePreviews.length} file(s) attached:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filePreviews.map((preview, index) => {
                       const isExisting = preview.url.startsWith('https');
                       return (
                          <div key={index} className="relative group aspect-square">
                            {preview.url.startsWith('blob:') ? (
                                <Image src={preview.url} alt={`Preview ${preview.name}`} fill className="rounded-md object-cover border" data-ai-hint="job image preview"/>
                            ) : (
                                <Image src={preview.url} alt={`Preview ${preview.name}`} fill className="rounded-md object-cover border" data-ai-hint="job image preview"/>
                            )}
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => removeFile(index, isExisting)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
