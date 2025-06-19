
import { beforeUserSignedIn } from "firebase-functions/v2/identity"; // Corrected import name
import * as logger from "firebase-functions/logger";

// Block users with unverified emails from signing in
// Note: Corrected trigger name to beforeUserSignedIn
export const checkEmailVerification = beforeUserSignedIn(async (event) => { // Use the correct trigger name here
  const user = event.data;

  // Check if the user's email is not verified
  // This check applies to all sign-in methods. If you want to be more specific,
  // you might inspect event.data.providerId or other event properties.
  if (user.email && !user.emailVerified) {
    logger.warn(`Sign-in blocked for user ${user.uid} (${user.email}) due to unverified email.`);
    // Throwing an exception here blocks the sign-in attempt
    // Access AuthBlockingError via the trigger function object (beforeUserSignedIn)
    throw new beforeUserSignedIn.AuthBlockingError( // Reference AuthBlockingError this way
      'unverified-email',
      'Please verify your email before signing in.'
    );
  }

  // If the email is verified, or if it's a sign-in method where email verification is not applicable (e.g. anonymous),
  // allow the sign-in to proceed.
  logger.info(`Sign-in allowed for user ${user.uid} (${user.email}).`);
  return {}; // Explicitly return an empty object or undefined for success
});
