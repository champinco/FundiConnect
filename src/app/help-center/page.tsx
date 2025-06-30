
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LifeBuoy, User, Wrench } from 'lucide-react';
import Link from "next/link";

const clientFaqs = [
  {
    question: "I can't log in to my account.",
    answer: "First, ensure you have verified your email address by clicking the link sent to your inbox after signing up. If you have forgotten your password, you can use the 'Forgot Password' link on the login page to reset it. If you're still having trouble, please contact support."
  },
  {
    question: "Why am I not receiving quotes for my job post?",
    answer: "To attract the best quotes, make sure your job description is as detailed as possible. Include what needs to be done, the problem you're facing, and upload clear photos or videos of the issue. A clear and detailed post helps Fundis understand the scope of work and provide an accurate quote."
  },
  {
    question: "How do I contact a Fundi?",
    answer: "Direct messaging is enabled once you accept a quote from a Fundi for a specific job, or when a Fundi confirms your booking request. This ensures that communication is focused and tied to a specific project. You can access your conversations from the 'Messages' link in the header menu when logged in."
  },
    {
    question: "How do I mark a job as completed?",
    answer: "Once a Fundi has finished the work, navigate to the specific job details page. If the job status is 'Assigned' or 'In Progress', you will see a button to 'Mark Job as Completed'. Clicking this will update the status and allow you to leave a review for the provider."
  }
];

const fundiFaqs = [
  {
    question: "Why is my profile not verified?",
    answer: "FundiConnect has an automated verification system. To get verified, your profile must be complete and meet certain criteria, including: a detailed bio (at least 100 characters), a clear profile picture (not a placeholder), specified service areas, years of experience, and at least one uploaded certification and two portfolio items. Once all criteria are met, the system will automatically grant you a verified badge."
  },
  {
    question: "I'm getting a CORS error when uploading images.",
    answer: "This is a one-time Firebase configuration issue. Your Firebase Storage needs to be told to accept uploads from your app's web address. We've included detailed, step-by-step instructions to fix this in the main README.md file of the project. Look for the 'How to Fix Firebase Storage CORS Errors' section."
  },
  {
    question: "How can I get more jobs?",
    answer: "A complete and professional profile is key! High-quality portfolio images, detailed descriptions of your skills and specialties, and verified certifications build trust with clients. Additionally, respond to job quotes quickly and professionally. Using the AI Job Triage tool can also help you prepare better for jobs."
  },
  {
    question: "How do I respond to a booking request?",
    answer: "All your incoming booking requests will appear on your main Dashboard. You will see options to 'Confirm' or 'Reject' each pending request. You can also add an optional message to the client when you respond."
  }
];

export default function HelpCenterPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <LifeBuoy className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold font-headline">Help Center & FAQ</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Find answers to common questions and troubleshooting tips to get the most out of FundiConnect.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Client Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">For Clients</CardTitle>
                <CardDescription>Help with posting jobs and hiring.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {clientFaqs.map((faq, index) => (
                <AccordionItem value={`client-${index}`} key={index}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Fundi Section */}
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline">For Fundis (Service Providers)</CardTitle>
                <CardDescription>Help with your profile and getting jobs.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {fundiFaqs.map((faq, index) => (
                <AccordionItem value={`fundi-${index}`} key={index}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
        <div className="text-center mt-12">
            <h3 className="text-xl font-semibold">Still need help?</h3>
            <p className="text-muted-foreground mt-2">If you can't find the answer you're looking for, please don't hesitate to reach out.</p>
            <Button asChild className="mt-4">
                <Link href="#">Contact Support</Link>
            </Button>
        </div>
    </div>
  );
}
