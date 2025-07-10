
"use client";

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Job } from '@/models/job';
import type { Quote } from '@/models/quote';

/**
 * Generates and downloads a PDF invoice for a completed job.
 * This function runs on the client-side.
 * @param job - The completed job object.
 * @param acceptedQuote - The accepted quote object for the job.
 */
export function generateInvoicePdf(job: Job, acceptedQuote: Quote) {
  const doc = new jsPDF();
  const provider = acceptedQuote.providerDetails;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(provider?.businessName || 'FundiConnect Provider', 14, 22);
  doc.setFontSize(12);
  doc.text('INVOICE', 190, 22, { align: 'right' });

  // Provider Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(provider?.location || 'Location not specified', 14, 30);
  // Add more provider details if available, e.g., phone, email

  // Invoice Details
  doc.text(`Invoice #: ${job.id.substring(0, 8)}`, 190, 30, { align: 'right' });
  doc.text(`Date: ${format(new Date(), 'PPP')}`, 190, 36, { align: 'right' });

  // Client Info (Bill To)
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(job.clientDetails?.name || `Client ID: ${job.clientId.substring(0,10)}...`, 14, 56);
  doc.text(`Job Location: ${job.location}`, 14, 62);
  
  // Table Header
  doc.setDrawColor(0);
  doc.setFillColor(230, 230, 230);
  doc.rect(14, 75, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 16, 81);
  doc.text('Amount', 190, 81, { align: 'right' });

  // Table Body
  doc.setFont('helvetica', 'normal');
  doc.text(job.title, 16, 91);
  doc.text(`${acceptedQuote.currency} ${acceptedQuote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 91, { align: 'right' });

  // Total
  doc.setDrawColor(0);
  doc.line(14, 110, 196, 110); // horizontal line
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 150, 118, { align: 'right' });
  doc.text(`${acceptedQuote.currency} ${acceptedQuote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, 118, { align: 'right' });

  // Footer / Notes
  doc.setFontSize(9);
  doc.text('Thank you for your business!', 14, 140);
  doc.text('Payment due upon receipt.', 14, 145);

  doc.save(`Invoice-${job.id.substring(0,8)}.pdf`);
}
