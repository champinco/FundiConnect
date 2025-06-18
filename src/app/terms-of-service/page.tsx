
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function TermsOfServicePage() {
  // NOTE: You should manually update this date whenever the terms are officially revised.
  const lastUpdatedDate = "October 26, 2023";

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <ScrollText className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-3xl font-headline">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-muted-foreground">
            Last Updated: {lastUpdatedDate}
          </p>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the FundiConnect mobile application and website (collectively, the "Service"), operated by FundiConnect ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">2. Description of Service</h2>
            <p>
              FundiConnect is a platform that connects individuals seeking services ("Clients") with independent service providers ("Fundis" or "Service Providers"). We provide tools for posting jobs, submitting quotes, communication, and facilitating bookings. FundiConnect is a marketplace and does not directly provide the services offered by Fundis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">3. User Accounts</h2>
            <p>
              To use certain features of the Service, you must register for an account. You agree to: (a) provide true, accurate, current, and complete information about yourself as prompted by the Service's registration form and (b) maintain and promptly update your registration data to keep it true, accurate, current, and complete. You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">4. User Conduct</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Post or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
              <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
              <li>Violate any applicable local, national, or international law.</li>
              <li>Engage in any activity that interferes with or disrupts the Service.</li>
            </ul>
            <p>We reserve the right to terminate accounts or remove content that violates these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">5. Service Provider and Client Responsibilities</h2>
            <h3 className="text-lg font-semibold">For Service Providers (Fundis):</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are an independent contractor and not an employee of FundiConnect.</li>
              <li>You are responsible for providing accurate information about your skills, experience, certifications, and services.</li>
              <li>You agree to perform services in a professional, workmanlike manner and in compliance with all applicable laws and regulations.</li>
              <li>You are responsible for your own tools, equipment, and insurance.</li>
              <li>You set your own prices and terms for services provided.</li>
            </ul>
            <h3 className="text-lg font-semibold">For Clients:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for clearly describing the job requirements.</li>
              <li>You are responsible for selecting a Fundi based on your own judgment.</li>
              <li>You agree to provide a safe working environment for Fundis.</li>
              <li>You are responsible for payments directly to the Fundi for services rendered, as agreed between you and the Fundi. (Note: FundiConnect does not currently process payments between users.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">6. Bookings and Cancellations</h2>
            <p>
              Clients may request bookings with Service Providers through the platform. Service Providers are responsible for confirming or rejecting booking requests. Both parties should communicate clearly regarding scheduling and any potential changes. Cancellation policies, if any, are determined by individual Service Providers unless otherwise specified by FundiConnect.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">7. Reviews and Ratings</h2>
            <p>
              Users may leave reviews and ratings for Service Providers. You agree that all reviews you post will be truthful and based on your actual experience. FundiConnect reserves the right to remove reviews that violate our policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">8. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive property of FundiConnect and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of FundiConnect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">9. Disclaimers and Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. FUNDICONNECT MAKES NO WARRANTIES, EXPRESS OR IMPLIED, REGARDING THE SERVICE, INCLUDING BUT NOT LIMITED TO THE ACCURACY, RELIABILITY, OR COMPLETENESS OF ANY INFORMATION OR THE QUALITY OF SERVICES PROVIDED BY FUNDIS.
            </p>
            <p>
              FUNDICONNECT IS NOT RESPONSIBLE FOR THE CONDUCT, WHETHER ONLINE OR OFFLINE, OF ANY USER OF THE SERVICE. WE ARE NOT LIABLE FOR ANY DAMAGES WHATSOEVER, WHETHER DIRECT, INDIRECT, GENERAL, SPECIAL, COMPENSATORY, CONSEQUENTIAL, AND/OR INCIDENTAL, ARISING OUT OF OR RELATING TO THE CONDUCT OF YOU OR ANYONE ELSE IN CONNECTION WITH THE USE OF THE SERVICE, INCLUDING WITHOUT LIMITATION, BODILY INJURY, EMOTIONAL DISTRESS, AND/OR ANY OTHER DAMAGES RESULTING FROM COMMUNICATIONS OR MEETINGS WITH OTHER USERS OR PERSONS YOU MEET THROUGH THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY TO YOU FOR ANY CAUSE OF ACTION WHATSOEVER, AND REGARDLESS OF THE FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID, IF ANY, BY YOU TO FUNDICONNECT FOR THE SERVICE DURING THE TERM OF MEMBERSHIP (IF APPLICABLE).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless FundiConnect, its officers, directors, employees, agents, and licensors from and against all losses, expenses, damages, and costs, including reasonable attorneys' fees, resulting from any violation of these Terms or any activity related to your account (including negligent or wrongful conduct) by you or any other person accessing the Service using your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">11. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">12. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>
          
        </CardContent>
      </Card>
    </div>
  );
}
