
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Loader2, User, Briefcase, Building, MapPinIcon, Phone, Award, FileText, Upload, Save, PlusCircle, Trash2, CalendarIcon, LinkIcon, ExternalLink, Pin, Sparkles, Tag, BookOpen, BellRing } from 'lucide-react'; // Added BellRing
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';
import ProviderProfileSkeleton from '@/components/skeletons/provider-profile-skeleton';

import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ProviderProfile, Certification } from '@/models/provider';
import type { User as AppUser } from '@/models/user';
import { uploadFileToStorage } from '@/services/storageService';

import { providerProfileEditFormSchema, type ProviderProfileEditFormValues, allServiceCategories } from './schemas';
import { updateProviderProfileAction, fetchProviderEditPageDataAction } from './actions';
import Image from 'next/image';
import { format, parse } from 'date-fns';
import Link from 'next/link';

export default function EditProviderProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isClientAccount, setIsClientAccount] = useState(false);

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);


  const { control, register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProviderProfileEditFormValues>({
    resolver: zodResolver(providerProfileEditFormSchema),
    defaultValues: {
      businessName: "",
      mainService: undefined,
      specialties: [],
      skills: [],
      bio: "",
      location: "",
      fullAddress: "",
      yearsOfExperience: 0,
      contactPhoneNumber: "",
      operatingHours: "",
      serviceAreas: "", 
      website: "",
      certifications: [],
      profilePictureUrl: null,
      bannerImageUrl: null,
      unavailableDates: [],
      receivesEmergencyJobAlerts: false, // Default for new field
    },
  });

  const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({
    control,
    name: "certifications",
  });
  
  const unavailableDatesValue = watch("unavailableDates") || [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoadingPage(true);
        const result = await fetchProviderEditPageDataAction(user.uid);
        if (result.error) {
          setFetchError(result.error);
          toast({ title: "Loading Error", description: result.error, variant: "destructive" });
        } else {
          if (result.appUser?.accountType === 'client') {
            setIsClientAccount(true);
          } else if (result.providerProfile) {
            reset({
              ...result.providerProfile,
              specialties: (result.providerProfile.specialties ?? []).join(', '), 
              skills: (result.providerProfile.skills ?? []).join(', '), 
              yearsOfExperience: result.providerProfile.yearsOfExperience ?? 0,
              serviceAreas: (result.providerProfile.serviceAreas ?? []).join(', '),
              certifications: (result.providerProfile.certifications ?? []).map(cert => ({
                ...cert,
                issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
                expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined,
                newDocumentFile: undefined,
              })),
              unavailableDates: (result.providerProfile.unavailableDates ?? []).map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())),
              receivesEmergencyJobAlerts: result.providerProfile.receivesEmergencyJobAlerts ?? false, // Load existing value
            });
            if (result.providerProfile.profilePictureUrl) setProfilePicturePreview(result.providerProfile.profilePictureUrl);
            if (result.providerProfile.bannerImageUrl) setBannerImagePreview(result.providerProfile.bannerImageUrl);
          } else if (result.appUser?.accountType === 'provider' && !result.providerProfile) {
             setFetchError("Provider profile data could not be loaded. It might not exist or there was an issue.");
          }
        }
        setIsLoadingPage(false);
      } else {
        router.push('/auth/login?redirect=/profile/edit');
        setIsLoadingPage(false);
      }
    });
    return () => unsubscribe();
  }, [router, reset, toast]);

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "File too large", description: "Profile picture should be less than 5MB.", variant: "destructive" });
        return;
      }
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
      setValue('newProfilePictureFile', file, { shouldValidate: true });
    }
  };
  
  const handleBannerImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Banner image should be less than 5MB.", variant: "destructive" });
        return;
      }
      setBannerImageFile(file);
      setBannerImagePreview(URL.createObjectURL(file));
      setValue('newBannerImageFile', file, { shouldValidate: true });
    }
  };


  const onSubmit = async (data: ProviderProfileEditFormValues) => {
    if (!currentUser) {
      toast({ title: "Not Authenticated", description: "Please log in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let uploadedProfilePicUrl: string | null | undefined = data.profilePictureUrl; 
    let uploadedBannerImgUrl: string | null | undefined = data.bannerImageUrl; 
    
    const uploadedCertificationDocuments: Array<{ index: number; url: string | null }> = [];

    try {
      if (profilePictureFile) {
        uploadedProfilePicUrl = await uploadFileToStorage(profilePictureFile, `providerProfiles/${currentUser.uid}/profilePictures`);
      }

      if (bannerImageFile) {
        uploadedBannerImgUrl = await uploadFileToStorage(bannerImageFile, `providerProfiles/${currentUser.uid}/bannerImages`);
      }

      if (data.certifications) {
        for (let i = 0; i < data.certifications.length; i++) {
          const cert = data.certifications[i];
          if (cert.newDocumentFile) {
            const docUrl = await uploadFileToStorage(cert.newDocumentFile, `providerProfiles/${currentUser.uid}/certifications/${cert.id || uuidv4()}`);
            uploadedCertificationDocuments.push({ index: i, url: docUrl });
          } else {
            uploadedCertificationDocuments.push({ index: i, url: cert.documentUrl || null }); 
          }
        }
      }
      
      const result = await updateProviderProfileAction(
        currentUser.uid, 
        data, 
        uploadedProfilePicUrl,
        uploadedBannerImgUrl,
        uploadedCertificationDocuments
      );

      if (result.success) {
        toast({ title: "Profile Updated", description: result.message });
        if(result.updatedProfile?.certifications) {
             setValue('certifications', result.updatedProfile.certifications.map(cert => ({
                ...cert,
                issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
                expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined,
                newDocumentFile: undefined,
            })));
        }
        if(result.updatedProfile?.unavailableDates) {
            setValue('unavailableDates', result.updatedProfile.unavailableDates.map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())));
        }
        if (uploadedProfilePicUrl) setProfilePicturePreview(uploadedProfilePicUrl);
        if (uploadedBannerImgUrl) setBannerImagePreview(uploadedBannerImgUrl);

      } else {
        toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPage) return <ProviderProfileSkeleton />;
  
  if (!currentUser && !isLoadingPage) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader><CardTitle>Login Required</CardTitle></CardHeader>
          <CardContent>
            <p>Please log in to edit your profile.</p>
            <Button asChild className="mt-4"><Link href="/auth/login?redirect=/profile/edit">Login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isClientAccount) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
         <Card className="max-w-md mx-auto">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent>
            <p>Profile editing is only available for provider accounts.</p>
            <Button asChild className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (fetchError) return <Alert variant="destructive" className="container max-w-lg mx-auto my-10"><AlertTitle>Error Loading Profile</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="max-w-3xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-headline">Edit Your Provider Profile</CardTitle>
            </div>
            <CardDescription>
              Keep your professional information up-to-date to attract more clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            <section>
              <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessName" className="font-semibold flex items-center"><Building className="mr-2 h-4 w-4" /> Business Name</Label>
                  <Input id="businessName" {...register("businessName")} className="mt-1" />
                  {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="contactPhoneNumber" className="font-semibold flex items-center"><Phone className="mr-2 h-4 w-4" /> Business Phone Number</Label>
                  <Input id="contactPhoneNumber" type="tel" {...register("contactPhoneNumber")} className="mt-1" />
                  {errors.contactPhoneNumber && <p className="text-sm text-destructive mt-1">{errors.contactPhoneNumber.message}</p>}
                </div>
                <div>
                  <Label htmlFor="location" className="font-semibold flex items-center"><MapPinIcon className="mr-2 h-4 w-4" /> Primary Location / Town</Label>
                  <Input id="location" {...register("location")} placeholder="e.g., Westlands, Nairobi" className="mt-1" />
                  {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="fullAddress" className="font-semibold">Full Address (Optional)</Label>
                  <Input id="fullAddress" {...register("fullAddress")} placeholder="e.g., Office Park, Waiyaki Way" className="mt-1" />
                  {errors.fullAddress && <p className="text-sm text-destructive mt-1">{errors.fullAddress.message}</p>}
                </div>
                <div>
                  <Label htmlFor="website" className="font-semibold flex items-center"><LinkIcon className="mr-2 h-4 w-4" /> Website (Optional)</Label>
                  <Input id="website" {...register("website")} placeholder="https://yourbusiness.co.ke" className="mt-1" />
                  {errors.website && <p className="text-sm text-destructive mt-1">{errors.website.message}</p>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">Service Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mainService" className="font-semibold flex items-center"><Briefcase className="mr-2 h-4 w-4" /> Main Service Category</Label>
                  <Controller
                    name="mainService"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="mainService" className="mt-1">
                          <SelectValue placeholder="Select your main service" />
                        </SelectTrigger>
                        <SelectContent>
                          {allServiceCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center"><ServiceCategoryIcon category={category} iconOnly className="mr-2 h-4 w-4" />{category}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.mainService && <p className="text-sm text-destructive mt-1">{errors.mainService.message}</p>}
                </div>
                <div>
                  <Label htmlFor="specialties" className="font-semibold flex items-center"><Sparkles className="mr-2 h-4 w-4" /> Specialties (Comma-separated)</Label>
                  <Input id="specialties" {...register("specialties")} placeholder="e.g., Drain unclogging, Geyser installation" className="mt-1" />
                  {errors.specialties && <p className="text-sm text-destructive mt-1">{errors.specialties.message}</p>}
                </div>
                <div>
                  <Label htmlFor="skills" className="font-semibold flex items-center"><Tag className="mr-2 h-4 w-4" /> Skills & Keywords (Comma-separated)</Label>
                  <Input id="skills" {...register("skills")} placeholder="e.g., Emergency plumbing, Solar panel repair, Kitchen renovation" className="mt-1" />
                  {errors.skills && <p className="text-sm text-destructive mt-1">{errors.skills.message}</p>}
                   <p className="text-xs text-muted-foreground mt-1">Help clients find you by listing specific skills or keywords related to your services.</p>
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience" className="font-semibold flex items-center"><Award className="mr-2 h-4 w-4" /> Years of Experience</Label>
                  <Input id="yearsOfExperience" type="number" {...register("yearsOfExperience")} className="mt-1" />
                  {errors.yearsOfExperience && <p className="text-sm text-destructive mt-1">{errors.yearsOfExperience.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="serviceAreas" className="font-semibold flex items-center"><Pin className="mr-2 h-4 w-4" /> Service Areas (Comma-separated)</Label>
                  <Input id="serviceAreas" {...register("serviceAreas")} placeholder="e.g., Kilimani, Lavington, Kileleshwa" className="mt-1" />
                  {errors.serviceAreas && <p className="text-sm text-destructive mt-1">{errors.serviceAreas.message}</p>}
                   <p className="text-xs text-muted-foreground mt-1">List the specific neighborhoods or areas you serve, separated by commas.</p>
                </div>
                <div>
                  <Label htmlFor="bio" className="font-semibold flex items-center"><FileText className="mr-2 h-4 w-4" /> Short Bio / Business Description</Label>
                  <Textarea id="bio" {...register("bio")} className="mt-1 min-h-[120px]" />
                  {errors.bio && <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="operatingHours" className="font-semibold">Operating Hours (Optional)</Label>
                  <Input id="operatingHours" {...register("operatingHours")} placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm" className="mt-1" />
                  {errors.operatingHours && <p className="text-sm text-destructive mt-1">{errors.operatingHours.message}</p>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">Profile Visuals</h3>
               <div className="space-y-4">
                <div>
                    <Label htmlFor="newProfilePictureFile" className="font-semibold flex items-center"><Upload className="mr-2 h-4 w-4" /> Profile Picture</Label>
                    {profilePicturePreview && <Image src={profilePicturePreview} alt="Profile preview" width={96} height={96} className="mt-2 h-24 w-24 rounded-full object-cover border" data-ai-hint="profile preview image" />}
                    <Input id="newProfilePictureFile" type="file" onChange={handleProfilePictureChange} accept="image/png, image/jpeg, image/webp" className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. Recommended: Square image.</p>
                    {errors.newProfilePictureFile && <p className="text-sm text-destructive mt-1">{errors.newProfilePictureFile.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="newBannerImageFile" className="font-semibold flex items-center"><Upload className="mr-2 h-4 w-4" /> Banner Image (Optional)</Label>
                    {bannerImagePreview && <Image src={bannerImagePreview} alt="Banner preview" width={300} height={100} className="mt-2 aspect-[3/1] w-full max-w-md rounded-md object-cover border" data-ai-hint="profile banner image"/>}
                    <Input id="newBannerImageFile" type="file" onChange={handleBannerImageChange} accept="image/png, image/jpeg, image/webp" className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. Recommended: 1200x400px.</p>
                    {errors.newBannerImageFile && <p className="text-sm text-destructive mt-1">{errors.newBannerImageFile.message}</p>}
                </div>
              </div>
            </section>
            
            <section>
                <h3 className="text-xl font-semibold mb-4 text-primary border-b pb-2">Availability & Preferences</h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="unavailableDates" className="font-semibold">Mark Unavailable Dates</Label>
                        <p className="text-sm text-muted-foreground mb-2">Select dates when you are NOT available.</p>
                        <Controller
                            name="unavailableDates"
                            control={control}
                            render={({ field }) => (
                                <Calendar
                                    mode="multiple"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    className="rounded-md border bg-background"
                                    footer={
                                    <p className="text-xs p-2 text-muted-foreground">
                                        You have marked {field.value?.length || 0} date(s) as unavailable.
                                    </p>
                                    }
                                />
                            )}
                        />
                        {errors.unavailableDates && <p className="text-sm text-destructive mt-1">{errors.unavailableDates.message}</p>}
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Controller
                        name="receivesEmergencyJobAlerts"
                        control={control}
                        render={({ field }) => (
                            <Switch
                            id="receivesEmergencyJobAlerts"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        )}
                        />
                        <Label htmlFor="receivesEmergencyJobAlerts" className="flex items-center">
                        <BellRing className="mr-2 h-4 w-4 text-orange-500" /> Receive Emergency Job Alerts
                        </Label>
                    </div>
                    {errors.receivesEmergencyJobAlerts && <p className="text-sm text-destructive mt-1">{errors.receivesEmergencyJobAlerts.message}</p>}
                 </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-semibold text-primary">Certifications</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendCertification({ 
                      id: uuidv4(), 
                      name: '', 
                      number: '', 
                      issuingBody: '', 
                      issueDate: undefined, 
                      expiryDate: undefined, 
                      documentUrl: null, 
                      newDocumentFile: undefined,
                      status: 'pending_review',
                      verificationNotes: null 
                    })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Certification
                </Button>
              </div>
              {certificationFields.length === 0 && <p className="text-sm text-muted-foreground">No certifications added yet.</p>}
              <div className="space-y-6">
                {certificationFields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`certName-${index}`} className="font-semibold">Certification Name</Label>
                        <Input id={`certName-${index}`} {...register(`certifications.${index}.name`)} className="mt-1 bg-background" />
                        {errors.certifications?.[index]?.name && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.name?.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`certNumber-${index}`} className="font-semibold">Certification Number</Label>
                        <Input id={`certNumber-${index}`} {...register(`certifications.${index}.number`)} className="mt-1 bg-background" />
                        {errors.certifications?.[index]?.number && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.number?.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`certIssuingBody-${index}`} className="font-semibold">Issuing Body</Label>
                        <Input id={`certIssuingBody-${index}`} {...register(`certifications.${index}.issuingBody`)} placeholder="e.g., EPRA, NCA" className="mt-1 bg-background" />
                         {errors.certifications?.[index]?.issuingBody && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.issuingBody?.message}</p>}
                      </div>
                       <div>
                        <Label htmlFor={`certStatus-${index}`} className="font-semibold">Status</Label>
                        <Input id={`certStatus-${index}`} value={watch(`certifications.${index}.status`) || 'N/A'} readOnly disabled className="mt-1 bg-background/50 border-dashed" />
                      </div>
                      <div>
                        <Label htmlFor={`certIssueDate-${index}`} className="font-semibold">Issue Date</Label>
                        <Controller
                          name={`certifications.${index}.issueDate`}
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 bg-background">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={value ? new Date(value) : undefined} onSelect={(date) => onChange(date)} initialFocus />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                         {errors.certifications?.[index]?.issueDate && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.issueDate?.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`certExpiryDate-${index}`} className="font-semibold">Expiry Date (Optional)</Label>
                         <Controller
                          name={`certifications.${index}.expiryDate`}
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 bg-background">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={value ? new Date(value) : undefined} onSelect={(date) => onChange(date)} initialFocus />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                        {errors.certifications?.[index]?.expiryDate && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.expiryDate?.message}</p>}
                      </div>
                       <div className="md:col-span-2">
                        <Label htmlFor={`certDocument-${index}`} className="font-semibold">Upload Document (PDF, JPG, PNG)</Label>
                        <Input 
                            id={`certDocument-${index}`} 
                            type="file" 
                            className="mt-1 bg-background file:text-primary file:bg-primary/10 hover:file:bg-primary/20"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setValue(`certifications.${index}.newDocumentFile`, e.target.files[0], { shouldValidate: true });
                                } else {
                                    setValue(`certifications.${index}.newDocumentFile`, null, { shouldValidate: true });
                                }
                            }}
                        />
                        {watch(`certifications.${index}.documentUrl`) && !watch(`certifications.${index}.newDocumentFile`) && (
                             <div className="mt-1 text-xs">
                                Current: <a href={watch(`certifications.${index}.documentUrl`)!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center"><ExternalLink className="h-3 w-3 mr-1"/>View Document</a>
                            </div>
                        )}
                        {watch(`certifications.${index}.newDocumentFile`) && (
                            <p className="text-xs text-muted-foreground mt-1">New file selected: {(watch(`certifications.${index}.newDocumentFile`) as File)?.name}</p>
                        )}
                         {errors.certifications?.[index]?.newDocumentFile && <p className="text-sm text-destructive mt-1">{errors.certifications[index]?.newDocumentFile?.message}</p>}
                      </div>
                      {watch(`certifications.${index}.verificationNotes`) && (
                        <div className="md:col-span-2">
                          <Label className="font-semibold">Verification Notes</Label>
                          <p className="text-sm text-muted-foreground p-2 bg-background/50 border-dashed border rounded mt-1">
                            {watch(`certifications.${index}.verificationNotes`)}
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCertification(index)}
                      className="mt-4"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

