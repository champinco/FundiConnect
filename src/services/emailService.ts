
// src/services/emailService.ts
"use server";

/**
 * @fileOverview Service for sending emails via the Firebase Trigger Email extension.
 * This service works by writing documents to a specified Firestore collection ('mail' by default),
 * which the extension then processes to send the actual email.
 *
 * PRE-REQUISITE: You MUST install and configure the "Trigger Email" extension from the Firebase console.
 * - Set the "Mail Collection" parameter to "mail" during configuration.
 * - Configure the SMTP settings with credentials from a transactional email provider like SendGrid, Mailgun, etc.
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { format } from 'date-fns';

const mailCollection = 'mail';

const sendEmail = async (to: string, subject: string, html: string, context?: Record<string, any>) => {
  if (!adminDb) {
    console.error("CRITICAL: adminDb not available. Email not sent. Please check Firebase Admin initialization.");
    return;
  }
  try {
    const emailDoc = {
      to: [to],
      message: {
        subject,
        html,
      },
    };
    await adminDb.collection(mailCollection).add(emailDoc);
    console.log(`Email document created for recipient: ${to} with subject: "${subject}"`);
    if (context) {
        console.log("Email Context:", context);
    }
  } catch (error) {
    console.error(`Failed to create email document for ${to}. Error:`, error);
  }
};


export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  const subject = "Welcome to FundiConnect!";
  const html = `
    <p>Hi ${name || 'User'},</p>
    <p>Welcome to FundiConnect! We're excited to have you on board.</p>
    <p>Start by posting a job or browsing for skilled Fundis in your area.</p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html);
}

export async function sendNewMessageAlert(to: string, senderName: string, chatId: string, messageSnippet: string): Promise<void> {
  const subject = `New Message from ${senderName} on FundiConnect`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const chatLink = `${appBaseUrl}/messages/${chatId}`;
  const html = `
    <p>Hi there,</p>
    <p>You have a new message from ${senderName}:</p>
    <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">
      ${messageSnippet}...
    </blockquote>
    <p><a href="${chatLink}">Click here to view the message</a></p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html, { chatId });
}

export async function sendBookingConfirmedEmail(to: string, providerName: string, clientName: string, bookingDate: Date, timeSlot: string): Promise<void> {
  const subject = `Booking Confirmed with ${providerName}`;
  const formattedDate = format(bookingDate, 'PPP');
  const html = `
    <p>Hi ${clientName},</p>
    <p>Your booking request with <strong>${providerName}</strong> for <strong>${formattedDate} at ${timeSlot}</strong> has been CONFIRMED.</p>
    <p>Please coordinate any further details directly with the provider through the in-app messaging.</p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html);
}

export async function sendBookingRejectedEmail(to: string, providerName: string, bookingDate: Date): Promise<void> {
  const subject = `Booking Update from ${providerName}`;
  const formattedDate = format(bookingDate, 'PPP');
  const html = `
    <p>Hi there,</p>
    <p>Regarding your booking request with <strong>${providerName}</strong> for ${formattedDate}, the provider was unable to confirm this request at this time.</p>
    <p>You can try requesting another date or browse for other providers.</p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html);
}

export async function sendBookingRequestProviderEmail(to: string, clientName: string, bookingDate: Date, messageFromClient?: string | null, timeSlot?: string | null): Promise<void> {
  const subject = `New Booking Request for ${format(bookingDate, 'PPP')}`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const dashboardLink = `${appBaseUrl}/dashboard`;
  let messageBody = `<p>Hi there,</p><p>You have a new booking request from <strong>${clientName}</strong> for <strong>${format(bookingDate, 'PPP')} at ${timeSlot || 'any time'}</strong>.</p>`;
  if (messageFromClient) {
    messageBody += `<p>Client's message:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em;">${messageFromClient}</blockquote>`;
  }
  messageBody += `<p>Please log in to your dashboard to respond: <a href="${dashboardLink}">View Dashboard</a></p><p>Thanks,<br/>The FundiConnect Team</p>`;
  await sendEmail(to, subject, messageBody);
}

export async function sendQuoteAcceptedEmail(to: string, jobTitle: string, clientName: string, jobId: string): Promise<void> {
  const subject = "Your Quote Was Accepted!";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}`;
  const html = `
    <p>Hi there,</p>
    <p>Congratulations! Your quote for the job "<strong>${jobTitle}</strong>" has been accepted by ${clientName}.</p>
    <p>View job details and start the conversation here: <a href="${jobLink}">View Job</a></p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html, { jobId });
}

export async function sendQuoteRejectedEmail(to: string, jobTitle: string, jobId: string): Promise<void> {
  const subject = "Update on Your Quote";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}`;
  const html = `
    <p>Hi there,</p>
    <p>Regarding your quote for the job "<strong>${jobTitle}</strong>", the client has chosen a different option this time.</p>
    <p>View the job here: <a href="${jobLink}">View Job</a></p>
    <p>Keep applying for other jobs!</p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html, { jobId });
}

export async function sendNewQuoteReceivedEmail(to: string, providerName: string, jobTitle: string, jobId: string): Promise<void> {
  const subject = `New Quote for Your Job: "${jobTitle.substring(0, 30)}..."`;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";
  const jobLink = `${appBaseUrl}/jobs/${jobId}?tab=quotes`;
  const html = `
    <p>Hi there,</p>
    <p>You've received a new quote from <strong>${providerName}</strong> for your job: "<strong>${jobTitle}</strong>".</p>
    <p><a href="${jobLink}">Review quotes now</a></p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html, { jobId });
}

export async function sendProviderVerifiedEmail(to: string, businessName: string, authority: string): Promise<void> {
  const subject = "Your FundiConnect Profile is Verified!";
  const html = `
    <p>Hi ${businessName},</p>
    <p>Congratulations! Your FundiConnect profile has been successfully verified by <strong>${authority}</strong>.</p>
    <p>This will increase trust and visibility on the platform.</p>
    <p>Thanks,<br/>The FundiConnect Team</p>
  `;
  await sendEmail(to, subject, html);
}

export async function sendCertificationStatusUpdateEmail(to: string, businessName: string, certName: string, status: string, notes: string | null): Promise<void> {
  const subject = `Update on Your Certification: ${certName}`;
  let html = `
    <p>Hi ${businessName},</p>
    <p>The status of your certification "<strong>${certName}</strong>" has been updated to: <strong>${status}</strong>.</p>
  `;
  if (notes) {
    html += `<p>Admin Notes: <em>${notes}</em></p>`;
  }
  html += `<p>Please review your profile for details.</p><p>Thanks,<br/>The FundiConnect Team</p>`;
  await sendEmail(to, subject, html);
}
