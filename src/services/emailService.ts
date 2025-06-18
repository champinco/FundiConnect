// src/services/emailService.ts
"use server";

/**
 * @fileOverview Placeholder service for sending emails.
 * In a real application, this would integrate with an actual email service
 * like SendGrid, Mailgun, AWS SES, or Firebase Trigger Email extension.
 */

import { format } from 'date-fns';

// Helper to simulate email sending by logging to console
const simulateEmailSend = (to: string, subject: string, body: string, context?: Record<string, any>) => {
  console.log("\n--- SIMULATING EMAIL SEND ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("Body:\n", body);
  if (context) {
    console.log("Context:", context);
  }
  console.log("--- END SIMULATED EMAIL ---\n");
  // In a real scenario, you'd return a promise indicating success/failure from the email provider.
  return Promise.resolve({ success: true, messageId: `simulated-${Date.now()}` });
};

export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  const subject = "Welcome to FundiConnect!";
  const body = `Hi ${name || 'User'},\n\nWelcome to FundiConnect! We're excited to have you on board.\n\nStart by posting a job or browsing for skilled Fundis in your area.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

export async function sendNewMessageAlert(to: string, senderName: string, chatId: string, messageSnippet: string): Promise<void> {
  const subject = `New Message from ${senderName} on FundiConnect`;
  // In a real app, you'd generate a direct link to the chat.
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002"; // Ensure this env var is set
  const chatLink = `${appBaseUrl}/messages/${chatId}`;
  const body = `Hi there,\n\nYou have a new message from ${senderName}:\n\n"${messageSnippet}..."\n\nView message: ${chatLink}\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body, { chatId });
}

export async function sendBookingConfirmedEmail(to: string, providerName: string, clientName: string, bookingDate: Date): Promise<void> {
  const subject = `Booking Confirmed with ${providerName}`;
  const formattedDate = format(bookingDate, 'PPP p');
  const body = `Hi ${clientName},\n\nYour booking request with ${providerName} for ${formattedDate} has been CONFIRMED.\n\nPlease coordinate any further details directly with the provider.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

export async function sendBookingRejectedEmail(to: string, providerName: string, bookingDate: Date): Promise<void> {
  const subject = `Booking Update from ${providerName}`;
  const formattedDate = format(bookingDate, 'PPP');
  const body = `Hi there,\n\nRegarding your booking request with ${providerName} for ${formattedDate}, the provider was unable to confirm this request at this time.\n\nYou can try requesting another date or browse for other providers.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

export async function sendBookingRequestProviderEmail(to: string, clientName: string, bookingDate: Date, messageFromClient?: string | null): Promise<void> {
  const subject = `New Booking Request for ${format(bookingDate, 'PPP')}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const dashboardLink = `${appBaseUrl}/dashboard`; // Providers manage bookings from their dashboard
  let body = `Hi there,\n\nYou have a new booking request from ${clientName} for ${format(bookingDate, 'PPP')}.\n`;
  if (messageFromClient) {
    body += `\nClient's message: "${messageFromClient}"\n`;
  }
  body += `\nPlease log in to your dashboard to respond: ${dashboardLink}\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

export async function sendQuoteAcceptedEmail(to: string, jobTitle: string, clientName: string, jobId: string): Promise<void> {
  const subject = "Your Quote Was Accepted!";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}`;
  const body = `Hi there,\n\nCongratulations! Your quote for the job "${jobTitle}" has been accepted by ${clientName}.\n\nView job details: ${jobLink}\n\nYou can now coordinate with the client.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body, { jobId });
}

export async function sendQuoteRejectedEmail(to: string, jobTitle: string, jobId: string): Promise<void> {
  const subject = "Update on Your Quote";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}`;
  const body = `Hi there,\n\nRegarding your quote for the job "${jobTitle}", the client has chosen a different option this time.\n\nView job: ${jobLink}\n\nKeep applying for other jobs!\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body, { jobId });
}

export async function sendNewQuoteReceivedEmail(to: string, providerName: string, jobTitle: string, jobId: string): Promise<void> {
  const subject = `New Quote for Your Job: "${jobTitle.substring(0, 30)}..."`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}?tab=quotes`;
  const body = `Hi there,\n\nYou've received a new quote from ${providerName} for your job: "${jobTitle}".\n\nReview quotes: ${jobLink}\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body, { jobId });
}

export async function sendProviderVerifiedEmail(to: string, businessName: string, authority: string): Promise<void> {
  const subject = "Your FundiConnect Profile is Verified!";
  const body = `Hi ${businessName},\n\nCongratulations! Your FundiConnect profile has been successfully verified by ${authority}.\nThis will increase trust and visibility on the platform.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

export async function sendCertificationStatusUpdateEmail(to: string, businessName: string, certName: string, status: string, notes: string | null): Promise<void> {
  const subject = `Update on Your Certification: ${certName}`;
  let body = `Hi ${businessName},\n\nThe status of your certification "${certName}" has been updated to: ${status}.\n`;
  if (notes) {
    body += `\nAdmin Notes: ${notes}\n`;
  }
  body += `\nPlease review your profile for details.\n\nThanks,\nThe FundiConnect Team`;
  await simulateEmailSend(to, subject, body);
}

// Example: Password Reset email is handled by Firebase Auth, but if you had a custom one:
// export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
//   const subject = "Reset Your FundiConnect Password";
//   const body = `Hi there,\n\nPlease click the link below to reset your password:\n${resetLink}\n\nIf you didn't request this, you can ignore this email.\n\nThanks,\nThe FundiConnect Team`;
//   await simulateEmailSend(to, subject, body);
// }
