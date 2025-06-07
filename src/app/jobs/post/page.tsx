"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Briefcase, Send } from 'lucide-react';
import ServiceCategoryIcon, { type ServiceCategory } from '@/components/service-category-icon';

// Tier 1 services + Other for job posting
const serviceCategories: ServiceCategory[] = [
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Garbage Collection',
  'Other'
];

export default function PostJobPage() {
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
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="jobTitle" className="font-semibold">Job Title</Label>
            <Input id="jobTitle" placeholder="e.g., Fix Leaking Kitchen Tap, Install New Ceiling Fans" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="serviceCategory" className="font-semibold">Service Category</Label>
            <Select>
              <SelectTrigger id="serviceCategory" className="mt-1">
                <SelectValue placeholder="Select a service category" />
              </SelectTrigger>
              <SelectContent>
                {serviceCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center">
                      <ServiceCategoryIcon category={category} iconOnly className="mr-2 h-4 w-4" />
                      {category}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="jobDescription" className="font-semibold">Detailed Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Provide as much detail as possible. What needs to be done? What is the problem? Any specific requirements?"
              className="min-h-[150px] mt-1"
            />
          </div>

          <div>
            <Label htmlFor="location" className="font-semibold">Location of Job</Label>
            <Input id="location" placeholder="e.g., Kilimani, Nairobi (Specific address if comfortable)" className="mt-1" />
          </div>
          
          <div>
            <Label htmlFor="jobUpload" className="font-semibold">Upload Photos/Videos (Optional)</Label>
            <div className="mt-1 flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                    </div>
                    <Input id="dropzone-file" type="file" className="hidden" multiple />
                </label>
            </div> 
            <p className="text-xs text-muted-foreground mt-1">Attach images or short videos of the problem area. This helps Fundis understand the job better.</p>
          </div>

          <div>
            <Label htmlFor="postingOption" className="font-semibold">Posting Option</Label>
             <Select defaultValue="public">
              <SelectTrigger id="postingOption" className="mt-1">
                <SelectValue placeholder="Select posting option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public Post (Notify relevant Fundis)</SelectItem>
                <SelectItem value="direct">Direct Post (Select specific Fundis - feature coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Send className="mr-2 h-4 w-4" /> Post Job
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
