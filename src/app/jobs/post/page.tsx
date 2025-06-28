
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
import { CalendarIcon, Upload, Briefcase, Send, Loader2, Paperclip, DollarSign, AlertTriangle, Clock, XCircle } from 'lucide-react'; 
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { useToast } from "@/hooks/use-toast";
import { postJobAction } from '../actions';
import { postJobFormSchema, type PostJobFormValues, jobUrgenciesForValidation, serviceCategoriesForValidation } from './schemas';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';
import { uploadFileToStorage } from '@/services/storageService';
import type { JobUrgency } from '@/models/job';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'; 
import { Calendar } from '@/components/ui/calendar'; 
import { format } from 'date-fns'; 
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const allServiceCategories: ServiceCategory[] = [...serviceCategoriesForValidation];
const jobUrgencies: JobUrgency[] = [...jobUrgenciesForValidation];


export default function PostJobPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string, name: string }[]>([]);
  const [showCorsError, setShowCorsError] = useState(false); // State for showing CORS error alert

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        router.push('/auth/login?redirect=/jobs/post');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobFormSchema),
    defaultValues: {
      jobTitle: "",
      serviceCategory: "",
      jobDescription: "",
      location: "",
      budget: undefined,
      urgency: "medium",
      deadline: null,
      postingOption: "public",
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Revoke old object URLs first
    filePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    
    if (event.target.files) {
      const filesArray = Array.from(event.target.files).slice(0, 5); 
      setSelectedFiles(filesArray);

      const newPreviews = filesArray.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      }));
      setFilePreviews(newPreviews);
    } else {
      setSelectedFiles([]);
      setFilePreviews([]);
    }
  };
  
  const removeFile = (indexToRemove: number) => {
    const urlToRevoke = filePreviews[indexToRemove]?.url;
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }

    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };


  const onSubmit = async (data: PostJobFormValues) => {
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
    setShowCorsError(false);
    
    try {
      let uploadedPhotoUrls: string[] = [];

      // Handle file uploads first
      if (selectedFiles.length > 0) {
        try {
          const uploadPromises = selectedFiles.map(file =>
            uploadFileToStorage(file, `jobs/${currentUser.uid}/attachments`)
          );
          uploadedPhotoUrls = await Promise.all(uploadPromises);
        } catch (uploadError: any) {
           if ((uploadError.code === 'storage/unknown' || uploadError.code === 'storage/unauthorized') && uploadError.message.toLowerCase().includes('cors')) {
              setShowCorsError(true);
              toast({
                  title: "File Upload Failed: Action Required",
                  description: "Your storage security settings are blocking uploads. Please see the alert on the page for instructions to fix this.",
                  variant: "destructive",
                  duration: 10000,
              });
            } else {
                toast({
                  title: "File Upload Failed",
                  description: uploadError.message || "Could not upload one or more files. Please try again.",
                  variant: "destructive",
                });
            }
            // Re-throw the error to be caught by the outer catch block, which will stop the process.
            throw new Error("File upload failed, preventing job post.");
        }
      }

      // If uploads are successful (or there are no files), proceed to post the job
      const result = await postJobAction(data, currentUser.uid, uploadedPhotoUrls);

      if (result.success && result.jobId) {
        toast({
          title: "Job Posted!",
          description: "Your job has been successfully posted.",
        });
        if (analytics) {
          logEvent(analytics, 'post_job', { 
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
        setFilePreviews([]);
        router.push(`/jobs/${result.jobId}`);
      } else {
        toast({
          title: "Failed to Post Job",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // This single catch block handles errors from both upload and post-action steps.
      // The toast for specific upload errors is already shown inside the inner catch.
      // We log here for debugging.
      console.error("Error during job submission process:", error.message);
    } finally {
      // This finally block ensures the loading state is always reset.
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
        
        {showCorsError && (
          <div className="px-4 sm:px-6 pb-4 border-b">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>File Upload Blocked: Action Required</AlertTitle>
              <AlertDescription>
                <p className="font-bold">This is a one-time Firebase configuration issue, not an app bug.</p>
                <p className="mt-2">
                  Your browser is blocking the upload for security reasons. To fix this, you must run a command in your terminal.
                </p>
                <p className="mt-2">
                  Please open the <code className="font-bold text-destructive-foreground">README.md</code> file for the complete, step-by-step instructions under the "How to Fix Firebase Storage CORS Errors" section.
                </p>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
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
              <Input
                id="serviceCategory"
                {...register("serviceCategory")}
                list="serviceCategories-datalist"
                placeholder="e.g., Plumbing, Electrical, or type a custom service"
                className="mt-1"
              />
              <datalist id="serviceCategories-datalist">
                {allServiceCategories.map(category => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              {errors.serviceCategory && <p className="text-sm text-destructive mt-1">{errors.serviceCategory.message}</p>}
            </div>

            <div>
              <Label htmlFor="jobDescription" className="font-semibold">Detailed Description</Label>
              <Textarea
                id="jobDescription"
                {...register("jobDescription")}
                placeholder="Provide as much detail as possible. What needs to be done? What is the problem? Any specific requirements?"
                className="min-h-[120px] sm:min-h-[150px] mt-1"
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
                    <AlertTriangle className="mr-2 h-4 w-4 text-primary"/> Urgency
                </Label>
                <Controller
                    name="urgency"
                    control={control}
                    defaultValue="medium"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'medium'} >
                        <SelectTrigger id="urgency" className="mt-1">
                        <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobUrgencies.map(urgency => (
                            <SelectItem key={urgency} value={urgency} className="capitalize">
                              {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                              {urgency === 'low' && " - Within a few days/weeks"}
                              {urgency === 'medium' && " - Within a day or two"}
                              {urgency === 'high' && " - Urgent / ASAP"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.urgency && <p className="text-sm text-destructive mt-1">{errors.urgency.message}</p>}
              </div>
            </div>
            
            <div>
                <Label htmlFor="deadline" className="font-semibold flex items-center"><Clock className="mr-2 h-4 w-4 text-primary"/> Preferred Completion Date (Optional)</Label>
                <Controller
                    name="deadline"
                    control={control}
                    render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={`w-full justify-start text-left font-normal mt-1 ${!field.value && "text-muted-foreground"}`}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } 
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    )}
                />
                {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline.message}</p>}
            </div>


            <div>
              <Label htmlFor="jobUpload" className="font-semibold">Upload Photos/Videos (Optional, up to 5)</Label>
              <div className="mt-1 flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, MP4, etc.</p>
                      </div>
                      <Input id="dropzone-file" type="file" className="hidden" multiple onChange={handleFileChange} accept="image/*,video/*" />
                  </label>
              </div>
              {filePreviews.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{filePreviews.length} file(s) selected:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filePreviews.map((preview, index) => (
                      <div key={index} className="relative group aspect-square">
                        {preview.type.startsWith('image/') ? (
                          <Image
                            src={preview.url}
                            alt={`Preview ${preview.name}`}
                            fill
                            className="rounded-md object-cover border"
                            data-ai-hint="job image preview"
                          />
                        ) : (
                          <video
                            src={preview.url}
                            className="rounded-md w-full h-full object-cover border"
                            controls={false}
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => removeFile(index)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Remove {preview.name}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Attach images or short videos of the problem area. This helps Fundis understand the job better.</p>
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
