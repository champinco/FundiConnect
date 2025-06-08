
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
import { Upload, Briefcase, Send, Loader2, Paperclip } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import { useToast } from "@/hooks/use-toast";
import { postJobAction, postJobFormSchema, type PostJobFormValues } from './actions';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { uploadFileToStorage } from '@/services/storageService';


// Tier 1 services + Other for job posting
const serviceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
  'Other'
];

// All service categories for the dropdown if needed, or keep it focused on Tier 1
const allServiceCategories: ServiceCategory[] = [
  'Plumbing', 'Electrical', 'Appliance Repair', 'Garbage Collection', 
  'HVAC', 'Solar Installation', 'Painting & Decorating', 'Carpentry & Furniture',
  'Landscaping', 'Tiling & Masonry', 'Pest Control', 'Locksmith', 'Other'
];


export default function PostJobPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
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
      postingOption: "public",
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Limit number of files (e.g., 5)
      const filesArray = Array.from(event.target.files).slice(0, 5);
      setSelectedFiles(filesArray);
    }
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
    let uploadedPhotoUrls: string[] = [];

    if (selectedFiles.length > 0) {
      try {
        const uploadPromises = selectedFiles.map(file => 
          uploadFileToStorage(file, `jobs/${currentUser.uid}/attachments/${Date.now()}`)
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
      const result = await postJobAction(data, currentUser.uid, uploadedPhotoUrls);
      if (result.success && result.jobId) {
        toast({
          title: "Job Posted!",
          description: "Your job has been successfully posted.",
        });
        reset(); // Reset form fields
        setSelectedFiles([]); // Clear selected files
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
            
            <div>
              <Label htmlFor="jobUpload" className="font-semibold">Upload Photos/Videos (Optional)</Label>
              <div className="mt-1 flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">Up to 5 images or short videos (e.g., PNG, JPG, MP4)</p>
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
