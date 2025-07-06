
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { getProviderProfileFromFirestore } from '@/services/providerService';
import { getAllJobsFromFirestore } from '@/services/jobService';
import { findSmartLeads, type FindSmartLeadsOutput } from '@/ai/flows/smart-leads';
import type { Job } from '@/models/job';

export interface SmartLead extends Job {
  reason: string;
  confidenceScore: number;
}

export async function getSmartLeadsAction(providerId: string): Promise<SmartLead[]> {
  if (!adminDb || !providerId) {
    throw new Error("User not authenticated or server error.");
  }

  try {
    const providerProfile = await getProviderProfileFromFirestore(providerId);
    if (!providerProfile) {
      throw new Error("Provider profile not found.");
    }

    // Fetch open jobs, potentially filtered by the provider's main category for efficiency
    const availableJobs = await getAllJobsFromFirestore(100); // Fetch up to 100 open jobs

    if (availableJobs.length === 0) {
      return [];
    }
    
    const aiInput = {
      providerProfile: {
        id: providerProfile.id,
        businessName: providerProfile.businessName,
        mainService: providerProfile.mainService,
        specialties: providerProfile.specialties,
        skills: providerProfile.skills,
        location: providerProfile.location,
        bio: providerProfile.bio,
      },
      availableJobs: availableJobs.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        serviceCategory: job.serviceCategory,
        location: job.location,
        budget: job.budget,
      })),
    };

    const suggestions: FindSmartLeadsOutput = await findSmartLeads(aiInput);

    if (suggestions.length === 0) {
      return [];
    }

    const suggestionMap = new Map(suggestions.map(s => [s.jobId, { reason: s.reason, confidenceScore: s.confidenceScore }]));
    
    const recommendedJobs = availableJobs.filter(job => suggestionMap.has(job.id));
    
    const smartLeads: SmartLead[] = recommendedJobs.map(job => ({
      ...job,
      reason: suggestionMap.get(job.id)!.reason,
      confidenceScore: suggestionMap.get(job.id)!.confidenceScore,
    })).sort((a, b) => b.confidenceScore - a.confidenceScore);

    return smartLeads;

  } catch (error: any) {
    console.error(`[getSmartLeadsAction] Error for provider ${providerId}:`, error.message);
    throw new Error("Failed to retrieve smart leads.");
  }
}
