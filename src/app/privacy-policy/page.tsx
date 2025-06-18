
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function PrivacyPolicyPage() {
  // NOTE: You should manually update this date whenever the policy is officially revised.
  const lastUpdatedDate = "October 26, 2023";

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <ScrollText className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <p className="text-muted-foreground">
            Last Updated: {lastUpdatedDate}
          </p>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">1. Introduction</h2>
            <p>
              Welcome to FundiConnect ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">2. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways. The information we may collect via the Service includes:</p>
            <h3 className="text-lg font-semibold">Personal Data</h3>
            <p>
              Personally identifiable information, such as your name, email address, phone number, and location, that you voluntarily give to us when you register with the Service or when you choose to participate in various activities related to the Service, such as posting jobs, submitting quotes, or messaging.
            </p>
            <h3 className="text-lg font-semibold">Profile Information (Service Providers)</h3>
            <p>
              If you are a service provider ("Fundi"), we collect additional information you provide for your public profile, including business name, services offered, skills, experience, certifications, portfolio images, and profile picture.
            </p>
            <h3 className="text-lg font-semibold">Derivative Data</h3>
            <p>
              Information our servers automatically collect when you access the Service, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Service.
            </p>
            <h3 className="text-lg font-semibold">Data From Third-Party Services</h3>
            <p>
              We may collect information if you log in to our Service through a third-party service (e.g., Google, Facebook). This may include your name, email, and profile picture from that service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">3. How We Use Your Information</h2>
            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and manage your account.</li>
              <li>Facilitate connections between clients and service providers.</li>
              <li>Process job postings, quotes, and bookings.</li>
              <li>Send you notifications related to your account activity.</li>
              <li>Improve the operation and customization of the Service.</li>
              <li>Monitor and analyze usage and trends to improve your experience.</li>
              <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity.</li>
              <li>Respond to your comments and questions and provide customer service.</li>
              <li>Comply with legal and regulatory requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">4. Disclosure of Your Information</h2>
            <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
            <h3 className="text-lg font-semibold">By Law or to Protect Rights</h3>
            <p>
              If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            </p>
            <h3 className="text-lg font-semibold">Service Providers</h3>
            <p>
              Public profiles of service providers, including their business name, services, location, ratings, and reviews, are visible to all users of the Service. Contact information may be shared once a job is assigned or a booking is confirmed to facilitate communication.
            </p>
            <h3 className="text-lg font-semibold">Clients</h3>
            <p>
              Information about jobs you post, such as the job description and location, will be visible to service providers who may be interested in quoting for the job. Your name or contact details are not publicly displayed with the job post but may be shared with a provider you hire.
            </p>
            <h3 className="text-lg font-semibold">Third-Party Service Providers</h3>
            <p>
              We may share your information with third parties that perform services for us or on our behalf, including payment processing (if applicable), data analysis, email delivery, hosting services, customer service, and marketing assistance. (Note: Actual third parties to be listed based on implementation).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">5. Data Security</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">6. Your Choices and Rights</h2>
            <p>You may at any time review or change the information in your account or terminate your account by:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Logging into your account settings and updating your account.</li>
              <li>Contacting us via the official support channels provided by FundiConnect.</li>
            </ul>
            <p>
              Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Service and/or comply with legal requirements.
            </p>
          </section>

           <section>
            <h2 className="text-xl font-semibold font-headline text-primary">7. Children's Privacy</h2>
            <p>
              Our Service is not intended for use by children under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold font-headline text-primary">8. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
