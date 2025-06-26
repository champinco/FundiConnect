"use client";

import { useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, Wrench, Lightbulb, Package, AlertTriangle, ListChecks } from 'lucide-react';
import type { AiJobTriageOutput } from '@/ai/flows/job-triage';
import { getAiJobTriageAction } from './actions';
import { serviceCategoriesForValidation } from '@/app/jobs/post/schemas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const triageSchema = z.object({
  jobTitle: z.string().min(5, 'Please provide a brief job title.'),
  serviceCategory: z.string({required_error: "Please select a service category."}).min(1, 'Please select a service category.'),
  jobDescription: z.string().min(20, 'Please provide a detailed job description (min 20 characters).'),
});

type TriageFormValues = z.infer<typeof triageSchema>;

export default function JobTriagePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiJobTriageOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<TriageFormValues>({
    resolver: zodResolver(triageSchema),
  });

  const onSubmit: SubmitHandler<TriageFormValues> = async (data) => {
    setIsLoading(true);
    setAiResult(null);
    setError(null);

    try {
      const result = await getAiJobTriageAction(data);
      setAiResult(result);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const ResultDisplay = ({ result }: { result: AiJobTriageOutput }) => (
    <Card className="mt-8 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary"><Wrench className="mr-2" /> AI Smart Ticket</CardTitle>
        <CardDescription>Here is the AI-generated analysis and toolkit for this job.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" /> AI Analysis</h3>
          <p className="text-muted-foreground mt-1"><strong>Likely Cause:</strong> {result.likelyCause}</p>
          <p className="text-muted-foreground mt-1"><strong>Urgency Assessment:</strong> <span className="font-medium">{result.urgencyAssessment}</span></p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center"><Package className="mr-2 h-5 w-5 text-green-600" /> Suggested Parts</h3>
            {result.suggestedParts.length > 0 ? (
              <ul className="list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                {result.suggestedParts.map((part, i) => <li key={i}>{part}</li>)}
              </ul>
            ) : <p className="text-muted-foreground text-sm mt-1">No specific parts suggested.</p>}
          </div>
          <div>
            <h3 className="font-semibold text-lg flex items-center"><Wrench className="mr-2 h-5 w-5 text-blue-600" /> Suggested Tools</h3>
             {result.suggestedTools.length > 0 ? (
              <ul className="list-disc pl-5 mt-1 text-muted-foreground space-y-1">
                {result.suggestedTools.map((tool, i) => <li key={i}>{tool}</li>)}
              </ul>
            ) : <p className="text-muted-foreground text-sm mt-1">No specific tools suggested.</p>}
          </div>
        </div>
        <div>
            <h3 className="font-semibold text-lg flex items-center"><ListChecks className="mr-2 h-5 w-5 text-purple-600" /> Notes for Artisan</h3>
            <p className="text-muted-foreground mt-1 whitespace-pre-line">{result.notesForArtisan}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">AI Job Triage & Toolkit</CardTitle>
          </div>
          <CardDescription>
            Input a job request to get an AI-powered analysis, including likely causes, suggested tools, and parts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" {...register('jobTitle')} placeholder="e.g., Leaking Kitchen Sink" className="mt-1" />
              {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
            </div>
            
            <div>
                <Label htmlFor="serviceCategory">Service Category</Label>
                <Controller
                  name="serviceCategory"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="serviceCategory" className="mt-1">
                            <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {serviceCategoriesForValidation.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  )}
                />
                {errors.serviceCategory && <p className="text-sm text-destructive mt-1">{errors.serviceCategory.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                {...register('jobDescription')}
                placeholder="Provide all details from the client. The more detail, the better the analysis."
                className="min-h-[150px] mt-1"
              />
              {errors.jobDescription && <p className="text-sm text-destructive mt-1">{errors.jobDescription.message}</p>}
            </div>
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Wrench className="mr-2 h-4 w-4" /> Generate Smart Ticket</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mt-8 max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {aiResult && <ResultDisplay result={aiResult} />}
    </div>
  );
}
