
import { beforeUserSignedIn, type AuthBlockingEvent } from "firebase-functions/v2/identity";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https"; // Import HttpsError
import { onDocumentUpdated } from "firebase-functions/v2/firestore"; // Import the Firestore trigger

// Block users with unverified emails from signing in
export const checkEmailVerification = beforeUserSignedIn(async (event: AuthBlockingEvent) => { // Explicitly type event
  const user = event.data;

  // Check if the user's email is not verified
  // This check applies to all sign-in methods. If you want to be more specific,
  // you might inspect event.data.providerId or other event properties.
  if (user.email && !user.emailVerified) {
    logger.warn(`Sign-in blocked for user ${user.uid} (${user.email}) due to unverified email.`);
    // Use HttpsError for blocking sign-in.
    // The client will receive this error and should display the message.
    throw new HttpsError(
      'unauthenticated', // A standard FunctionsErrorCode. 'failed-precondition' could also be used.
      'Please verify your email before signing in.'
    );
  }

  // If the email is verified, or if it's a sign-in method where email verification is not applicable (e.g. anonymous),
  // allow the sign-in to proceed.
  logger.info(`Sign-in allowed for user ${user.uid} (${user.email}). Email verified: ${user.emailVerified}`);
  return {}; // Explicitly return an empty object or undefined for success
});


/**
 * Automatically verifies a provider's profile if it meets a set of completeness criteria.
 * This function triggers whenever a document in the 'providerProfiles' collection is updated.
 */
export const autoVerifyProviderProfile = onDocumentUpdated("providerProfiles/{providerId}", async (event) => {
    if (!event.data) {
        logger.info("No data associated with the event. Exiting.");
        return null;
    }

    const profileAfter = event.data.after.data();

    // Exit early if the profile is already verified to prevent loops.
    if (profileAfter.isVerified === true) {
        logger.info(`Profile ${event.params.providerId} is already verified. No action needed.`);
        return null;
    }

    // Define the verification criteria
    const criteria = {
        hasBusinessName: profileAfter.businessName && profileAfter.businessName.length > 2,
        hasValidPhone: profileAfter.contactPhoneNumber && /^\+?[0-9\s-()]{7,20}$/.test(profileAfter.contactPhoneNumber),
        hasDetailedBio: profileAfter.bio && profileAfter.bio.length >= 100,
        hasProfilePicture: profileAfter.profilePictureUrl && !profileAfter.profilePictureUrl.includes('placehold.co'),
        hasServiceAreas: profileAfter.serviceAreas && profileAfter.serviceAreas.length > 0,
        hasExperience: profileAfter.yearsOfExperience && profileAfter.yearsOfExperience > 0,
        hasSpecialties: profileAfter.specialties && profileAfter.specialties.length > 0,
        hasSkills: profileAfter.skills && profileAfter.skills.length > 0,
        hasPortfolio: profileAfter.portfolio && profileAfter.portfolio.filter((p: { imageUrl: any; }) => p.imageUrl).length >= 2,
        hasCertifications: profileAfter.certifications && profileAfter.certifications.length >= 1,
    };
    
    // Check if all criteria are met
    const allCriteriaMet = Object.values(criteria).every(Boolean);

    logger.info(`Checking verification criteria for provider ${event.params.providerId}. All criteria met: ${allCriteriaMet}.`);
    logger.info("Criteria details:", criteria);


    if (allCriteriaMet) {
        logger.info(`All verification criteria met for provider ${event.params.providerId}. Updating status to verified.`);
        return event.data.after.ref.update({
            isVerified: true,
            verificationAuthority: "Automated System Check"
        });
    } else {
        logger.info(`Verification criteria not met for provider ${event.params.providerId}. No action needed.`);
        return null; // Explicitly return null for no-op
    }
});
