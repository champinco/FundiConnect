import { beforeSignIn } from "firebase-functions/v2/identity";
import * as logger from "firebase-functions/logger";

// Block users with unverified emails from signing in
export const checkEmailVerification = beforeSignIn(async (event) => {
  const user = event.data;

  // Check if the user's email is not verified
  // This check applies to all sign-in methods. If you want to be more specific,
  // you might inspect event.data.providerId or other event properties.
  if (user.email && !user.emailVerified) {
    logger.warn(`Sign-in blocked for user ${user.uid} (${user.email}) due to unverified email.`);
    // Throwing an exception here blocks the sign-in attempt
    throw new beforeSignIn.AuthBlockingError(
      'unverified-email',
      'Please verify your email before signing in.'
    );
  }

  // If the email is verified, or if it's a sign-in method where email verification is not applicable (e.g. anonymous),
  // allow the sign-in to proceed.
  logger.info(`Sign-in allowed for user ${user.uid} (${user.email}).`);
  return {}; // Explicitly return an empty object or undefined for success
});
