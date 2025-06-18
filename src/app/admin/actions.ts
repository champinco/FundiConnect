// src/app/admin/actions.ts
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { ProviderProfile, Certification } from '@/models/provider';
import { ADMIN_USER_UIDS } from '@/config/admin';
import { createNotification } from '@/services/notificationService';
import { sendProviderVerifiedEmail, sendCertificationStatusUpdateEmail } from '@/services/emailService';

async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  return ADMIN_USER_UIDS.includes(userId);
}

interface AdminProviderProfile extends ProviderProfile {
  email?: string; // Add email for admin display
}

export async function fetchAllProvidersForAdminAction(currentUserId: string | null): Promise<{ providers: AdminProviderProfile[], error?: string }> {
  if (!await isAdmin(currentUserId)) {
    return { providers: [], error: "Unauthorized access." };
  }
  if (!adminDb) return { providers: [], error: "Server error: Database not initialized." };

  try {
    const providerSnaps = await adminDb.collection('providerProfiles').orderBy('businessName').get();
    const providers: AdminProviderProfile[] = [];

    for (const doc of providerSnaps.docs) {
      const data = doc.data() as ProviderProfile;
      
      // Attempt to fetch user email from 'users' collection
      let email: string | undefined;
      try {
        const userDoc = await adminDb.collection('users').doc(data.userId).get();
        if (userDoc.exists) {
          email = userDoc.data()?.email;
        }
      } catch (emailError) {
        console.warn(`[AdminActions] Could not fetch email for provider ${data.userId}:`, emailError);
      }

      const certifications: Certification[] = (data.certifications || []).map(cert => ({
        ...cert,
        issueDate: cert.issueDate ? (cert.issueDate as unknown as Timestamp).toDate() : null,
        expiryDate: cert.expiryDate ? (cert.expiryDate as unknown as Timestamp).toDate() : null,
      }));

      providers.push({
        ...data,
        id: doc.id,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        certifications,
        email: email,
      });
    }
    return { providers };
  } catch (error: any) {
    console.error("[AdminActions] Error fetching all providers:", error);
    return { providers: [], error: "Failed to fetch providers." };
  }
}

export async function setProviderVerificationStatusAction(
  currentUserId: string | null,
  providerId: string,
  isVerified: boolean,
  verificationAuthority: string | null
): Promise<{ success: boolean, message: string }> {
  if (!await isAdmin(currentUserId)) {
    return { success: false, message: "Unauthorized action." };
  }
  if (!adminDb) return { success: false, message: "Server error: Database not initialized." };
  if (!providerId) return { success: false, message: "Provider ID is required." };

  try {
    const providerRef = adminDb.collection('providerProfiles').doc(providerId);
    await providerRef.update({
      isVerified: isVerified,
      verificationAuthority: isVerified ? verificationAuthority : null, // Only set authority if verified
      updatedAt: FieldValue.serverTimestamp()
    });

    // Notify provider
    const providerProfile = (await providerRef.get()).data() as ProviderProfile | undefined;
    if (providerProfile) {
      const providerUserSnap = await adminDb.collection('users').doc(providerId).get();
      const providerEmail = providerUserSnap.data()?.email;

      if (isVerified) {
        await createNotification({
          userId: providerId,
          type: 'job_status_changed', // Consider a more specific type like 'profile_verified'
          message: `Congratulations! Your FundiConnect profile has been verified by ${verificationAuthority || 'Admin'}.`,
          link: '/profile'
        });
        if (providerEmail) {
          await sendProviderVerifiedEmail(providerEmail, providerProfile.businessName, verificationAuthority || 'FundiConnect Admin');
        }
      } else {
         await createNotification({
          userId: providerId,
          type: 'job_status_changed', 
          message: `Your FundiConnect profile verification status has been updated. It is currently not marked as verified.`,
          link: '/profile'
        });
        // Optionally send an email for un-verification if needed
      }
    }

    return { success: true, message: `Provider verification status updated to ${isVerified ? 'Verified' : 'Not Verified'}.` };
  } catch (error: any) {
    console.error(`[AdminActions] Error updating provider verification for ${providerId}:`, error);
    return { success: false, message: "Failed to update provider verification status." };
  }
}

export async function updateCertificationStatusAction(
  currentUserId: string | null,
  providerId: string,
  certificationId: string,
  newStatus: Certification['status'],
  verificationNotes: string | null
): Promise<{ success: boolean, message: string }> {
  if (!await isAdmin(currentUserId)) {
    return { success: false, message: "Unauthorized action." };
  }
  if (!adminDb) return { success: false, message: "Server error: Database not initialized." };
  if (!providerId || !certificationId) return { success: false, message: "Provider ID and Certification ID are required." };

  try {
    const providerRef = adminDb.collection('providerProfiles').doc(providerId);
    const providerSnap = await providerRef.get();
    if (!providerSnap.exists) {
      return { success: false, message: "Provider profile not found." };
    }
    const providerData = providerSnap.data() as ProviderProfile;
    const certifications = providerData.certifications || [];
    const certIndex = certifications.findIndex(c => c.id === certificationId);

    if (certIndex === -1) {
      return { success: false, message: "Certification not found for this provider." };
    }

    certifications[certIndex].status = newStatus;
    certifications[certIndex].verificationNotes = verificationNotes || null;
    // Ensure dates are converted back to Timestamps if they were Dates in the model from a previous fetch
    certifications[certIndex].issueDate = certifications[certIndex].issueDate ? Timestamp.fromDate(new Date(certifications[certIndex].issueDate!)) : null;
    certifications[certIndex].expiryDate = certifications[certIndex].expiryDate ? Timestamp.fromDate(new Date(certifications[certIndex].expiryDate!)) : null;


    await providerRef.update({
      certifications: certifications,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Notify provider about certification status change
    const statusText = newStatus.replace('_', ' ');
    await createNotification({
      userId: providerId,
      type: 'job_status_changed', // Consider 'certification_status_updated'
      message: `The status of your certification "${certifications[certIndex].name}" has been updated to: ${statusText}.${verificationNotes ? ` Notes: ${verificationNotes.substring(0,50)}...` : ''}`,
      link: '/profile/edit' // Link to edit profile to see details
    });

    const providerUserSnap = await adminDb.collection('users').doc(providerId).get();
    const providerEmail = providerUserSnap.data()?.email;
    if(providerEmail){
      await sendCertificationStatusUpdateEmail(providerEmail, providerData.businessName, certifications[certIndex].name, statusText, verificationNotes);
    }


    return { success: true, message: `Certification '${certifications[certIndex].name}' status updated to ${statusText}.` };
  } catch (error: any) {
    console.error(`[AdminActions] Error updating certification ${certificationId} for provider ${providerId}:`, error);
    return { success: false, message: "Failed to update certification status." };
  }
}
