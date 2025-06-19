"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEmailVerification = void 0;
const identity_1 = require("firebase-functions/v2/identity");
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https"); // Import HttpsError
// Block users with unverified emails from signing in
exports.checkEmailVerification = (0, identity_1.beforeUserSignedIn)(async (event) => {
    const user = event.data;
    // Check if the user's email is not verified
    // This check applies to all sign-in methods. If you want to be more specific,
    // you might inspect event.data.providerId or other event properties.
    if (user.email && !user.emailVerified) {
        logger.warn(`Sign-in blocked for user ${user.uid} (${user.email}) due to unverified email.`);
        // Use HttpsError for blocking sign-in.
        // The client will receive this error and should display the message.
        throw new https_1.HttpsError('unauthenticated', // A standard FunctionsErrorCode. 'failed-precondition' could also be used.
        'Please verify your email before signing in.');
    }
    // If the email is verified, or if it's a sign-in method where email verification is not applicable (e.g. anonymous),
    // allow the sign-in to proceed.
    logger.info(`Sign-in allowed for user ${user.uid} (${user.email}). Email verified: ${user.emailVerified}`);
    return {}; // Explicitly return an empty object or undefined for success
});
//# sourceMappingURL=index.js.map